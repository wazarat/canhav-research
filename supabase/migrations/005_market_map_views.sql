-- 005_market_map_views.sql
-- Two views that feed the market-map UI:
--
--   v_market_map_grid   -> one row per root entity (deduped), with
--                           aggregated sector/subsector arrays for filtering
--                           and the primary classification inlined for the card.
--   v_entity_detail     -> one row per (entity, classification) for the
--                           detail modal: shows every subsector the entity
--                           (and any collapsed product children) appears in.
--
-- Dedup rules:
--   * parent_entity_id = NULL means "root". The grid only returns roots.
--   * Multi-classified entities appear once in the grid. The `sectors` and
--     `subsectors` arrays carry every filter-tag they belong to.
--   * The detail view follows the parent: querying by root_entity_id also
--     returns rows from collapsed product children (e.g. "Alchemy Pay"
--     rows when looking up "Alchemy").
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)
-- Applied: 2026-04-18

BEGIN;

-- ============================================================
-- v_entity_detail
--   Row per (child-entity, classification). Joins every entity to its
--   root via parent_entity_id so the frontend can fetch a root and get
--   back rows for itself + all children + every subsector they appear in.
-- ============================================================
CREATE OR REPLACE VIEW public.v_entity_detail AS
SELECT
  -- Root-entity info (may equal self when parent_entity_id IS NULL)
  COALESCE(e.parent_entity_id, e.entity_id) AS root_entity_id,
  root_e.entity_name                        AS root_entity_name,
  root_e.canonical_website                  AS root_canonical_website,
  root_e.logo_url                           AS root_logo_url,
  root_e.year_founded                       AS root_year_founded,
  root_e.hq_location                        AS root_hq_location,
  root_e.funding_stage                      AS root_funding_stage,
  root_e.twitter_handle                     AS root_twitter_handle,
  root_e.github_org                         AS root_github_org,
  root_e.tags                               AS root_tags,

  -- Child-entity (or root itself) identity
  e.entity_id,
  e.entity_name,
  e.entity_uuid,
  e.parent_entity_id,

  -- Classification (per-subsector) payload — the "differing headlines"
  ec.entity_classification_id,
  ec.is_primary,
  s.sector_id,
  s.sector_name,
  sb.subsector_id,
  sb.subsector_name,
  ec.description,
  ec.website,
  ec.maintaining_organization,
  ec.reason_for_inclusion,
  ec.practitioners_note,
  ec.practitioner_validation_check
FROM public.entities e
LEFT JOIN public.entities root_e
       ON root_e.entity_id = COALESCE(e.parent_entity_id, e.entity_id)
JOIN public.entity_classifications ec ON ec.entity_id = e.entity_id
JOIN public.subsectors sb              ON sb.subsector_id = ec.subsector_id
JOIN public.sectors s                  ON s.sector_id = sb.sector_id;

COMMENT ON VIEW public.v_entity_detail IS
  'One row per (entity, classification). Used by the company detail modal: '
  'filter by root_entity_id to get all subsector entries for a company '
  'including collapsed product children.';

-- ============================================================
-- v_market_map_grid
--   One row per ROOT entity. All subsector/sector filter values are
--   aggregated so the UI can filter by any tag without duplicating cards.
--   The primary_* fields give the card its headline sector + copy.
-- ============================================================
CREATE OR REPLACE VIEW public.v_market_map_grid AS
WITH all_classifications AS (
  -- Pull classifications from the entity itself AND from any collapsed
  -- product children so the grid card inherits their tags.
  SELECT
    COALESCE(e.parent_entity_id, e.entity_id) AS root_id,
    s.sector_id,
    s.sector_name,
    sb.subsector_id,
    sb.subsector_name,
    ec.entity_id AS source_entity_id,
    ec.entity_classification_id,
    ec.description,
    ec.website,
    ec.maintaining_organization,
    ec.is_primary,
    -- Primary flag is per child; a root is "primary" only via its own row.
    (ec.is_primary AND e.parent_entity_id IS NULL) AS is_root_primary
  FROM public.entities e
  JOIN public.entity_classifications ec ON ec.entity_id = e.entity_id
  JOIN public.subsectors sb              ON sb.subsector_id = ec.subsector_id
  JOIN public.sectors s                  ON s.sector_id = sb.sector_id
),
primary_row AS (
  SELECT DISTINCT ON (root_id)
    root_id,
    sector_name      AS primary_sector,
    sector_id        AS primary_sector_id,
    subsector_name   AS primary_subsector,
    subsector_id     AS primary_subsector_id,
    description      AS primary_description,
    website          AS primary_classification_website,
    maintaining_organization AS primary_maintaining_organization
  FROM all_classifications
  WHERE is_root_primary = true
  ORDER BY root_id, entity_classification_id
),
agg AS (
  SELECT
    root_id,
    array_agg(DISTINCT sector_name    ORDER BY sector_name)    AS sectors,
    array_agg(DISTINCT subsector_name ORDER BY subsector_name) AS subsectors,
    array_agg(DISTINCT sector_id)     AS sector_ids,
    array_agg(DISTINCT subsector_id)  AS subsector_ids,
    count(*)                          AS classification_count,
    count(DISTINCT source_entity_id)  AS member_entity_count
  FROM all_classifications
  GROUP BY root_id
)
SELECT
  root.entity_id,
  root.entity_name,
  root.entity_uuid,
  root.canonical_website,
  root.logo_url,
  root.year_founded,
  root.hq_location,
  root.funding_stage,
  root.twitter_handle,
  root.github_org,
  root.tags,

  pr.primary_sector,
  pr.primary_sector_id,
  pr.primary_subsector,
  pr.primary_subsector_id,
  pr.primary_description,
  pr.primary_classification_website,
  pr.primary_maintaining_organization,

  agg.sectors,
  agg.subsectors,
  agg.sector_ids,
  agg.subsector_ids,
  agg.classification_count,
  agg.member_entity_count,

  -- Children list (for "expand to sub-products" UI). Empty array if no children.
  COALESCE(
    (SELECT jsonb_agg(
              jsonb_build_object('entity_id', c.entity_id, 'entity_name', c.entity_name)
              ORDER BY c.entity_name
            )
       FROM public.entities c
      WHERE c.parent_entity_id = root.entity_id),
    '[]'::jsonb
  ) AS sub_entities
FROM public.entities root
JOIN agg         ON agg.root_id = root.entity_id
LEFT JOIN primary_row pr ON pr.root_id = root.entity_id
WHERE root.parent_entity_id IS NULL;

COMMENT ON VIEW public.v_market_map_grid IS
  'Deduped grid: one row per root company. sectors[] / subsectors[] carry '
  'every tag the company (incl. collapsed children) belongs to, so the UI '
  'can filter by any sector without double-counting cards.';

COMMIT;
