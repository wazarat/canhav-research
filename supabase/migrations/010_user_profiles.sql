-- 010_user_profiles.sql
-- Viewer-side profile table. Separate from public.admin_users which is the
-- editor allow-list. Any authenticated viewer (Google or email magic link)
-- gets a row here on first access to a gated page.
--
-- Columns:
--   user_id          uuid  PK  FK auth.users(id)  cascades on delete
--   email            text
--   full_name        text         — whatever the OAuth provider gave us
--   avatar_url       text
--   referral_source  text         — future: UTM / homepage CTA id
--   is_paid          boolean      — future: Substack webhook flips this
--   created_at       timestamptz
--   last_seen_at     timestamptz
--
-- RLS:
--   * SELECT: a user can read their own row. Service-role bypasses RLS
--     to support admin tooling (/admin/members could be extended later).
--   * UPSERT: a user can insert / update their own row.
--
-- Trigger: touch last_seen_at on every update.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  full_name       text,
  avatar_url      text,
  referral_source text,
  is_paid         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email
  ON public.user_profiles (lower(email));

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_self     ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_self     ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_self     ON public.user_profiles;

CREATE POLICY user_profiles_select_self
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_profiles_insert_self
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_profiles_update_self
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-touch last_seen_at on update.
CREATE OR REPLACE FUNCTION public.user_profiles_touch_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_seen_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_touch ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_touch
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.user_profiles_touch_last_seen();

COMMIT;
