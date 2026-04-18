-- 007_merge_admin.sql
-- Safe de-duplication support for the /admin/entities page.
--
-- Introduces:
--   1. pg_trgm extension (fuzzy name similarity)
--   2. public.entity_merges        -> audit trail with full JSONB snapshot so
--                                     every merge is reversible.
--   3. public.entity_never_merge   -> editor-curated denylist of pairs that
--                                     must NEVER be suggested / merged, with
--                                     a self-enforcing ordered (a<b) + unique
--                                     constraint.
--   4. public.v_merge_candidate_groups -> near-duplicate groups of root
--                                     entities, with confidence score and
--                                     per-group never-merge warnings inlined.
--
-- Everything here is additive: no changes to existing tables, no destructive
-- ALTERs, every entity keeps its own entity_id + classifications. The existing
-- v_market_map_grid filters parent_entity_id IS NULL, so merges applied via
-- the admin UI take effect immediately on the grid with zero further schema
-- changes.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

-- ============================================================
-- 1. Trigram extension for fuzzy name similarity scoring
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. Audit table
--    Every merge writes one row here. Snapshot stores the child's previous
--    parent_entity_id (almost always NULL), name, canonical_website, etc.
--    so unmerge can fully restore state. `reverted_at` is set by the
--    unmerge endpoint instead of deleting the audit row, preserving history.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_merges (
  merge_id         bigserial PRIMARY KEY,
  parent_entity_id bigint      NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  child_entity_id  bigint      NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  merged_at        timestamptz NOT NULL DEFAULT now(),
  merged_by        text,
  reason           text,
  snapshot         jsonb       NOT NULL,
  reverted_at      timestamptz,
  reverted_by      text,
  CONSTRAINT entity_merges_no_self CHECK (parent_entity_id <> child_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_merges_child_active
  ON public.entity_merges(child_entity_id)
  WHERE reverted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_merges_parent
  ON public.entity_merges(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_merges_merged_at
  ON public.entity_merges(merged_at DESC);

COMMENT ON TABLE public.entity_merges IS
  'Audit trail for /admin/entities merges. One row per merge action. '
  'Unmerge sets reverted_at + restores child.parent_entity_id from snapshot.';

-- Lock down: admin APIs use service role. Anon + authenticated must not see
-- the audit trail (contains editor notes / reasons).
ALTER TABLE public.entity_merges ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Never-merge denylist
--    Pairs are stored with entity_a < entity_b so the UNIQUE constraint
--    catches duplicates regardless of insertion order. Admin API must
--    normalise (least, greatest) before insert.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_never_merge (
  never_id   bigserial PRIMARY KEY,
  entity_a   bigint      NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  entity_b   bigint      NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  reason     text,
  added_by   text,
  added_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_never_merge_ordered CHECK (entity_a < entity_b),
  CONSTRAINT entity_never_merge_unique  UNIQUE (entity_a, entity_b)
);

CREATE INDEX IF NOT EXISTS idx_entity_never_merge_a ON public.entity_never_merge(entity_a);
CREATE INDEX IF NOT EXISTS idx_entity_never_merge_b ON public.entity_never_merge(entity_b);

COMMENT ON TABLE public.entity_never_merge IS
  'Editor-curated "these are NOT the same company" denylist. Admin API '
  'normalises each pair as (least(a,b), greatest(a,b)) so the UNIQUE '
  'constraint catches duplicates either way.';

ALTER TABLE public.entity_never_merge ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Candidate groups view
--    Groups root entities (parent_entity_id IS NULL) by a normalised base
--    name (lower-cased, trailing "(...)"/"[...]" suffix stripped) and
--    annotates each group with:
--      * avg pairwise pg_trgm similarity
--      * shared canonical domain (boolean)
--      * same primary sector across members (boolean)
--      * composite confidence score 0-100
--      * any never-merge edges that exist within the group (jsonb, for UI)
-- ============================================================
DROP VIEW IF EXISTS public.v_merge_candidate_groups;

CREATE VIEW public.v_merge_candidate_groups AS
WITH roots AS (
  SELECT
    e.entity_id,
    e.entity_name,
    e.canonical_website,
    e.logo_url,
    trim(lower(regexp_replace(e.entity_name, '\s*[\(\[].*[\)\]]\s*$', ''))) AS base_name,
    lower(regexp_replace(coalesce(e.canonical_website, ''), '^https?://(www\.)?|/.*$', '', 'g')) AS domain,
    (SELECT s.sector_name
       FROM public.entity_classifications ec
       JOIN public.subsectors sb ON sb.subsector_id = ec.subsector_id
       JOIN public.sectors s     ON s.sector_id    = sb.sector_id
      WHERE ec.entity_id = e.entity_id AND ec.is_primary
      LIMIT 1) AS primary_sector,
    (SELECT count(*)
       FROM public.entity_classifications ec
      WHERE ec.entity_id = e.entity_id) AS classification_count
  FROM public.entities e
  WHERE e.parent_entity_id IS NULL
),
grouped AS (
  SELECT
    base_name,
    count(*) AS member_count,
    array_agg(entity_id   ORDER BY classification_count DESC, entity_id) AS member_ids,
    array_agg(entity_name ORDER BY classification_count DESC, entity_id) AS member_names,
    array_agg(DISTINCT primary_sector)
      FILTER (WHERE primary_sector IS NOT NULL) AS primary_sectors,
    array_agg(DISTINCT NULLIF(domain, ''))
      FILTER (WHERE NULLIF(domain, '') IS NOT NULL) AS domains,
    jsonb_agg(jsonb_build_object(
      'entity_id',           entity_id,
      'entity_name',         entity_name,
      'canonical_website',   canonical_website,
      'logo_url',            logo_url,
      'domain',              NULLIF(domain, ''),
      'primary_sector',      primary_sector,
      'classification_count', classification_count
    ) ORDER BY classification_count DESC, entity_id) AS members
  FROM roots
  WHERE base_name <> ''
  GROUP BY base_name
  HAVING count(*) > 1
),
annotated AS (
  SELECT
    g.*,
    (COALESCE(cardinality(g.primary_sectors), 0) <= 1) AS same_primary_sector,
    (COALESCE(cardinality(g.domains), 0)         <= 1) AS shared_domain,
    COALESCE((
      SELECT round(avg(similarity(lower(a.entity_name), lower(b.entity_name)))::numeric, 3)
      FROM public.entities a
      JOIN public.entities b
        ON b.entity_id > a.entity_id
      WHERE a.entity_id = ANY (g.member_ids)
        AND b.entity_id = ANY (g.member_ids)
    ), 0) AS avg_similarity
  FROM grouped g
)
SELECT
  a.base_name,
  a.member_count,
  a.member_ids,
  a.member_names,
  a.members,
  a.primary_sectors,
  a.domains,
  a.same_primary_sector,
  a.shared_domain,
  a.avg_similarity,
  -- Composite confidence 0-100. Heuristic weights:
  --   trigram similarity contributes up to 60 (avg 0..1 -> 0..60)
  --   shared canonical domain adds 25
  --   all members share a primary sector adds 15
  LEAST(100, GREATEST(0, (
    (a.avg_similarity * 60) +
    (CASE WHEN a.shared_domain      THEN 25 ELSE 0 END) +
    (CASE WHEN a.same_primary_sector THEN 15 ELSE 0 END)
  )))::numeric(5,2) AS confidence,
  -- Never-merge edges WITHIN this group. UI renders a warning badge on
  -- affected pairs; merge API re-checks on the server before applying.
  COALESCE((
    SELECT jsonb_agg(
             jsonb_build_object(
               'a',      nm.entity_a,
               'b',      nm.entity_b,
               'reason', nm.reason
             )
             ORDER BY nm.entity_a, nm.entity_b
           )
    FROM public.entity_never_merge nm
    WHERE nm.entity_a = ANY (a.member_ids)
      AND nm.entity_b = ANY (a.member_ids)
  ), '[]'::jsonb) AS never_merge_edges
FROM annotated a
ORDER BY confidence DESC, member_count DESC, base_name;

COMMENT ON VIEW public.v_merge_candidate_groups IS
  'Near-duplicate root entities grouped by normalised base name. Used by '
  'the /admin/entities UI. confidence is a heuristic 0-100; never_merge_edges '
  'lists pairs already flagged as NOT the same company.';

COMMIT;
