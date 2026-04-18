-- 011_user_events.sql
-- Lightweight event log for signed-in viewers. Populated fire-and-forget
-- by POST /api/events. No dashboard yet (that's Milestone 3); we just want
-- the data retained so the future analytics install has history to chew.
--
-- Columns:
--   event_id     bigserial     — surrogate PK for ordering / dedup
--   user_id      uuid          — FK auth.users; NULL allowed for system events
--   event_type   text          — e.g. 'company_view', 'sector_filter'
--   entity_id    int           — optional; FK to public.entities
--   url          text          — referrer path
--   meta         jsonb         — freeform, e.g. {'sector': 'DeFi'}
--   created_at   timestamptz
--
-- RLS: users can INSERT their own rows; reads are service-role-only until
-- we expose an admin dashboard. Writes are additionally proxied through
-- /api/events which re-validates the user, so a compromised anon key
-- can't flood this table from the browser.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_events (
  event_id    bigserial   PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  entity_id   integer     REFERENCES public.entities(entity_id) ON DELETE SET NULL,
  url         text,
  meta        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_created
  ON public.user_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_entity
  ON public.user_events (entity_id) WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_events_type_created
  ON public.user_events (event_type, created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_events_insert_self ON public.user_events;
CREATE POLICY user_events_insert_self
  ON public.user_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No SELECT / UPDATE / DELETE policies → authenticated readers can't
-- see anything; the service-role bypass is the only way to read.

COMMIT;
