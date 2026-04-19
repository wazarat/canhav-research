-- 014_grid_primary_practitioners_note.sql
-- Extend v_market_map_grid with the primary classification's
-- practitioner's note so the list view can show it as a column
-- without an extra round-trip to /api/company/[id].
--
-- Replaces the view in-place: we DROP + CREATE because PostgREST's
-- dependent entities (v_entity_detail) only reference the table, not
-- the view, so we can just redeploy the grid view on its own.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

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
  'Deduped grid: one row per root company. 014 adds primary_practitioners_note '
  'so the /market-map list view can show it as a column.';

-- Nudge PostgREST to pick up the new column without waiting for the
-- ambient 10-minute refresh.
NOTIFY pgrst, 'reload schema';

COMMIT;
