-- 013_user_stars.sql
-- Per-viewer "starred company" list. Powers the /saved page and the
-- side-by-side comparison flow.
--
-- Columns:
--   star_id     bigserial PK
--   user_id     uuid       FK auth.users(id) ON DELETE CASCADE
--   entity_id   bigint     FK public.entities(entity_id) ON DELETE CASCADE
--   note        text       — optional short note the user can attach
--   created_at  timestamptz
--
-- A user can star a given entity at most once (unique constraint).
--
-- RLS:
--   * SELECT / INSERT / DELETE: self only.
--   * Service role bypasses RLS (admin tooling & analytics roll-ups).
--
-- No public read policy — starring is a private research action.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_stars (
  star_id    bigserial PRIMARY KEY,
  user_id    uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id  bigint    NOT NULL REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stars_user
  ON public.user_stars (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stars_entity
  ON public.user_stars (entity_id);

-- RLS -------------------------------------------------------------------------
ALTER TABLE public.user_stars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_stars_select_self ON public.user_stars;
DROP POLICY IF EXISTS user_stars_insert_self ON public.user_stars;
DROP POLICY IF EXISTS user_stars_update_self ON public.user_stars;
DROP POLICY IF EXISTS user_stars_delete_self ON public.user_stars;

CREATE POLICY user_stars_select_self
  ON public.user_stars FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_stars_insert_self
  ON public.user_stars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_stars_update_self
  ON public.user_stars FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_stars_delete_self
  ON public.user_stars FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
