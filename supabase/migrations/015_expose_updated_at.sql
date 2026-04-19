-- 015_expose_updated_at.sql
-- Milestone 5 / CAN-NEW-12: surface entities.updated_at so the UI can show
-- "Updated 2 weeks ago" on the entity profile + drawer. While we're touching
-- the views anyway, also expose it on v_market_map_grid so the list view
-- can render a freshness column later if we want.
--
-- Both views are recreated in-place (DROP + CREATE). Downstream API code
-- already selects * from v_entity_detail so no code change is needed to
-- pick up the new column.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

-- ============================================================
-- v_entity_detail: add root_updated_at
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
  root_e.updated_at                         AS root_updated_at,

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
  'One row per (entity, classification). 015 adds root_updated_at so the '
  'profile and drawer can show a freshness timestamp.';

-- ============================================================
-- v_market_map_grid: add updated_at on the root
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
    ec.practitioners_note,
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
    sector_name              AS primary_sector,
    sector_id                AS primary_sector_id,
    subsector_name           AS primary_subsector,
    subsector_id             AS primary_subsector_id,
    description              AS primary_description,
    website                  AS primary_classification_website,
    maintaining_organization AS primary_maintaining_organization,
    practitioners_note       AS primary_practitioners_note
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
  root.updated_at,

  pr.primary_sector,
  pr.primary_sector_id,
  pr.primary_subsector,
  pr.primary_subsector_id,
  pr.primary_description,
  pr.primary_classification_website,
  pr.primary_maintaining_organization,
  pr.primary_practitioners_note,

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
  'Deduped grid: one row per root company. 015 adds root.updated_at for '
  'per-row freshness display.';

NOTIFY pgrst, 'reload schema';

COMMIT;
