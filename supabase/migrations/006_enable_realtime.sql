-- 006_enable_realtime.sql
-- Enable Supabase Realtime on the tables backing the Market Map so that
-- browsers can subscribe to postgres_changes and auto-refresh when the
-- DB mutates (no reload, no stale Vercel edge cache).
--
-- Notes:
--   * Realtime in Supabase works by adding tables to the built-in
--     `supabase_realtime` publication. Views are not replicated — we
--     subscribe to the underlying tables and the client refetches the
--     view on any event.
--   * REPLICA IDENTITY FULL is set so UPDATE/DELETE events carry the full
--     previous row (useful for filtering old rows out of the UI).
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)
-- Applied: 2026-04-18

BEGIN;

-- Ensure each table emits full row data on change events (needed for
-- UPDATE/DELETE payloads to be useful client-side).
ALTER TABLE public.entities                 REPLICA IDENTITY FULL;
ALTER TABLE public.entity_classifications   REPLICA IDENTITY FULL;
ALTER TABLE public.sectors                  REPLICA IDENTITY FULL;
ALTER TABLE public.subsectors               REPLICA IDENTITY FULL;

-- Add to publication (idempotent-ish: wrap in DO blocks so re-runs don't error).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'entities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entities;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'entity_classifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_classifications;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sectors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sectors;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subsectors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subsectors;
  END IF;
END $$;

COMMIT;
