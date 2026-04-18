-- ============================================================================
-- Migration 012: Per-subsector datapoint framework
--
-- Each of the 7 sector sheets has one tab per subsector with sheet-specific
-- columns (e.g. "Agent Archetype", "Mainnet Status", "Ethereum Role", etc.
-- for AI Agents; completely different headers for RWA, Stablecoins, …).
--
-- Strategy (per user decision):
--   * One real, typed table per subsector: public.subsector_data_<slug>.
--   * A tiny registry (subsector_tables) mapping subsector_id → table_name +
--     display schema so the UI can render labels in order.
--   * An audit/queue pair (subsector_ingest_runs, subsector_ingest_unmatched)
--     so every sheet upload is reviewable.
--   * entity_aliases fuels pre-merge fuzzy matching: when an entity was
--     merged into another, its historical name still matches. Seeded from
--     entity_merges.snapshot, and a trigger keeps it fresh on future merges.
-- ============================================================================

-- Per-entity alias table (previous names, DBAs, etc.) -------------------------
CREATE TABLE IF NOT EXISTS public.entity_aliases (
  alias_id      bigserial PRIMARY KEY,
  entity_id     bigint NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  alias_name    text   NOT NULL,
  alias_norm    text   GENERATED ALWAYS AS (lower(regexp_replace(alias_name, '[^a-z0-9]+', '', 'gi'))) STORED,
  source        text   NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','merge','seed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, alias_norm)
);

CREATE INDEX IF NOT EXISTS idx_entity_aliases_norm ON public.entity_aliases (alias_norm);

-- Seed aliases from historical merges. For each completed merge, the child
-- entity's pre-merge snapshot is pulled into aliases pointing at the parent.
INSERT INTO public.entity_aliases (entity_id, alias_name, source)
SELECT m.parent_entity_id,
       m.snapshot->>'child_entity_name',
       'seed'
FROM public.entity_merges m
WHERE m.reverted_at IS NULL
  AND COALESCE(m.snapshot->>'child_entity_name','') <> ''
ON CONFLICT (entity_id, alias_norm) DO NOTHING;

-- Keep aliases in sync when new merges happen ---------------------------------
CREATE OR REPLACE FUNCTION public.entity_merges_sync_aliases() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.reverted_at IS NULL) THEN
    INSERT INTO public.entity_aliases (entity_id, alias_name, source)
    VALUES (NEW.parent_entity_id,
            COALESCE(NEW.snapshot->>'child_entity_name',''),
            'merge')
    ON CONFLICT (entity_id, alias_norm) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_entity_merges_aliases ON public.entity_merges;
CREATE TRIGGER trg_entity_merges_aliases
AFTER INSERT ON public.entity_merges
FOR EACH ROW EXECUTE FUNCTION public.entity_merges_sync_aliases();

-- Subsector table registry ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subsector_tables (
  subsector_id   bigint PRIMARY KEY REFERENCES public.subsectors(subsector_id) ON DELETE CASCADE,
  table_name     text   NOT NULL UNIQUE,
  -- display_schema is an ordered array of { key, label, type, is_url?, is_long? }
  display_schema jsonb  NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Ingest runs -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subsector_ingest_runs (
  ingest_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subsector_id    bigint      NOT NULL REFERENCES public.subsectors(subsector_id) ON DELETE CASCADE,
  source_url      text        NOT NULL,
  sheet_tab       text,
  name_column     text        NOT NULL DEFAULT 'Entity',
  columns         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  row_count_total int         NOT NULL DEFAULT 0,
  row_count_matched int       NOT NULL DEFAULT 0,
  row_count_unmatched int     NOT NULL DEFAULT 0,
  row_count_ambiguous int     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed','committed','failed','reverted')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  actor_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  error           text
);
CREATE INDEX IF NOT EXISTS idx_subsector_ingest_runs_subsector
  ON public.subsector_ingest_runs (subsector_id, started_at DESC);

-- Unmatched / ambiguous rows queued for manual review -------------------------
CREATE TABLE IF NOT EXISTS public.subsector_ingest_unmatched (
  id                   bigserial PRIMARY KEY,
  ingest_id            uuid      NOT NULL REFERENCES public.subsector_ingest_runs(ingest_id) ON DELETE CASCADE,
  subsector_id         bigint    NOT NULL REFERENCES public.subsectors(subsector_id) ON DELETE CASCADE,
  row_number           int       NOT NULL,
  raw                  jsonb     NOT NULL,
  candidate_entity_ids bigint[]  NOT NULL DEFAULT '{}',
  candidate_scores     jsonb     NOT NULL DEFAULT '[]'::jsonb,
  resolved_entity_id   bigint    REFERENCES public.entities(entity_id) ON DELETE SET NULL,
  resolution_status    text      NOT NULL DEFAULT 'pending'
                                 CHECK (resolution_status IN ('pending','resolved','skipped','created')),
  resolved_by          uuid      REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingest_unmatched_pending
  ON public.subsector_ingest_unmatched (resolution_status, created_at)
  WHERE resolution_status = 'pending';

-- RLS: service-role writes everything, no public reads via API (we go through
-- server routes with requireAdmin).
ALTER TABLE public.entity_aliases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsector_tables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsector_ingest_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsector_ingest_unmatched  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT the registry so the viewer-side detail
-- page can discover which table to read per subsector without needing admin.
DROP POLICY IF EXISTS subsector_tables_read ON public.subsector_tables;
CREATE POLICY subsector_tables_read ON public.subsector_tables
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS entity_aliases_read ON public.entity_aliases;
CREATE POLICY entity_aliases_read ON public.entity_aliases
  FOR SELECT TO authenticated USING (true);

-- Helper: sanitise a subsector name into a safe, stable table-name slug.
-- Deterministic so we can re-derive it without storing it.
CREATE OR REPLACE FUNCTION public.subsector_table_slug(p_name text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT 'subsector_data_' || regexp_replace(
    regexp_replace(lower(p_name), '[^a-z0-9]+', '_', 'g'),
    '(^_|_$)', '', 'g'
  )
$$;
