-- 004_enrich_entities_and_parent_linking.sql
-- Adds company-level columns, a self-FK for collapsing product variants
-- (e.g. "Alchemy (Data APIs)" -> parent "Alchemy"), and an is_primary flag
-- on classifications so the grid has a single canonical card per entity.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)
-- Applied: 2026-04-18

BEGIN;

-- ============================================================
-- 1. Company-level columns on public.entities
--    These are properties of the company, not the classification,
--    so they belong here (one value per entity, stable across sectors).
-- ============================================================
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS parent_entity_id bigint
    REFERENCES public.entities(entity_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canonical_website text,
  ADD COLUMN IF NOT EXISTS logo_url          text,
  ADD COLUMN IF NOT EXISTS year_founded      integer,
  ADD COLUMN IF NOT EXISTS hq_location       text,
  ADD COLUMN IF NOT EXISTS funding_stage     text,
  ADD COLUMN IF NOT EXISTS twitter_handle    text,
  ADD COLUMN IF NOT EXISTS github_org        text,
  ADD COLUMN IF NOT EXISTS tags              text[];

-- Disallow an entity being its own parent (prevents trivial cycles).
ALTER TABLE public.entities
  DROP CONSTRAINT IF EXISTS entities_no_self_parent;
ALTER TABLE public.entities
  ADD CONSTRAINT entities_no_self_parent
    CHECK (parent_entity_id IS NULL OR parent_entity_id <> entity_id);

CREATE INDEX IF NOT EXISTS idx_entities_parent_entity_id
  ON public.entities(parent_entity_id);

COMMENT ON COLUMN public.entities.parent_entity_id IS
  'Self-FK used to collapse product variants onto a parent company. '
  'E.g. "Alchemy (Data APIs)".parent_entity_id = "Alchemy".entity_id. '
  'Grid view shows only rows where parent_entity_id IS NULL (roots).';

COMMENT ON COLUMN public.entities.canonical_website IS
  'Primary company URL. Distinct from entity_classifications.website, '
  'which may hold a subsector-specific docs or product URL.';

-- ============================================================
-- 2. is_primary flag on classifications
--    Each entity gets exactly one primary classification, which the
--    grid view uses for the card's headline, description, and accent sector.
-- ============================================================
ALTER TABLE public.entity_classifications
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Enforce at most one primary per entity via a partial unique index.
DROP INDEX IF EXISTS idx_entity_classifications_one_primary;
CREATE UNIQUE INDEX idx_entity_classifications_one_primary
  ON public.entity_classifications(entity_id)
  WHERE is_primary = true;

-- Backfill: mark the oldest (lowest-id) classification per entity as primary.
-- This is deterministic and reversible. Editors can toggle later.
WITH first_per_entity AS (
  SELECT DISTINCT ON (entity_id) entity_classification_id
  FROM public.entity_classifications
  ORDER BY entity_id, entity_classification_id
)
UPDATE public.entity_classifications ec
   SET is_primary = true
 WHERE ec.entity_classification_id IN (SELECT entity_classification_id FROM first_per_entity)
   AND ec.is_primary = false;

COMMIT;
