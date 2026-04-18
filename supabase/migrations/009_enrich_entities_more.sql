-- 009_enrich_entities_more.sql
-- Adds rich-profile columns to public.entities so the /company/[id] detail
-- page has something to render beyond the existing name/website/HQ. All
-- columns are nullable — existing inserts keep working unchanged.
--
-- Columns:
--   long_description     text         — single authoritative company blurb
--                                       (vs per-classification description).
--   founders             text[]       — plain names for now; can migrate to
--                                       jsonb later if we need linkedin URLs.
--   total_funding_usd    numeric      — cumulative funding raised in USD.
--   last_funding_date    date         — when the last round closed.
--   investors            text[]       — list of investor names.
--   token_symbol         text         — ticker, e.g. UNI, if the company
--                                       has a token.
--   chains               text[]       — deployment chains: ethereum,
--                                       arbitrum, base, etc.
--   linkedin_url         text
--   discord_url          text
--   telegram_url         text
--   farcaster_handle     text
--   status               text CHECK   — active | acquired | defunct | fork.
--
-- Also re-creates public.v_entity_detail and public.v_market_map_grid to
-- expose the new columns so the APIs pick them up automatically. Existing
-- columns are unchanged in shape/order from migration 005.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS long_description  text,
  ADD COLUMN IF NOT EXISTS founders          text[],
  ADD COLUMN IF NOT EXISTS total_funding_usd numeric,
  ADD COLUMN IF NOT EXISTS last_funding_date date,
  ADD COLUMN IF NOT EXISTS investors         text[],
  ADD COLUMN IF NOT EXISTS token_symbol      text,
  ADD COLUMN IF NOT EXISTS chains            text[],
  ADD COLUMN IF NOT EXISTS linkedin_url      text,
  ADD COLUMN IF NOT EXISTS discord_url       text,
  ADD COLUMN IF NOT EXISTS telegram_url      text,
  ADD COLUMN IF NOT EXISTS farcaster_handle  text,
  ADD COLUMN IF NOT EXISTS status            text;

-- Accept a small controlled vocabulary; NULL is allowed (unknown).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_status_check'
  ) THEN
    ALTER TABLE public.entities
      ADD CONSTRAINT entities_status_check
      CHECK (status IS NULL OR status IN ('active','acquired','defunct','fork','unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entities_token_symbol
  ON public.entities (lower(token_symbol)) WHERE token_symbol IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entities_status
  ON public.entities (status) WHERE status IS NOT NULL;

-- ============================================================
-- Recreate v_entity_detail with the new columns.
-- Postgres CREATE OR REPLACE can't add columns in the middle of a view
-- that other objects depend on; DROP first, then recreate.
-- ============================================================
DROP VIEW IF EXISTS public.v_entity_detail;
CREATE VIEW public.v_entity_detail AS
SELECT
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
  root_e.long_description                   AS root_long_description,
  root_e.founders                           AS root_founders,
  root_e.total_funding_usd                  AS root_total_funding_usd,
  root_e.last_funding_date                  AS root_last_funding_date,
  root_e.investors                          AS root_investors,
  root_e.token_symbol                       AS root_token_symbol,
  root_e.chains                             AS root_chains,
  root_e.linkedin_url                       AS root_linkedin_url,
  root_e.discord_url                        AS root_discord_url,
  root_e.telegram_url                       AS root_telegram_url,
  root_e.farcaster_handle                   AS root_farcaster_handle,
  root_e.status                             AS root_status,

  e.entity_id,
  e.entity_name,
  e.entity_uuid,
  e.parent_entity_id,

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
  'One row per (entity, classification). Used by /api/company/[id]. '
  'Includes enriched root_* columns from migration 009.';

-- ============================================================
-- Recreate v_market_map_grid with new columns. Grid list only needs the
-- light summary fields (status, token_symbol, chains) for filter chips;
-- the heavy fields stay on the detail view.
-- ============================================================
DROP VIEW IF EXISTS public.v_market_map_grid;
CREATE VIEW public.v_market_map_grid AS
WITH all_classifications AS (
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
  root.token_symbol,
  root.chains,
  root.status,

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
  'Deduped grid: one row per root company. Enriched by migration 009 to '
  'include status / token_symbol / chains for filter chips.';

COMMIT;
