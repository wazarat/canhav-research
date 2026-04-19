-- 017_newsletter_signups.sql
-- Milestone 5 / CAN-NEW-05: NewsletterBanner intake table.
--
-- Minimal email capture for the newsletter banner in the site footer.
-- Provider choice (Substack, ConvertKit, Beehiiv, …) is deferred; this
-- table gives us a durable home for signups so the UI can ship today
-- and migrate email-by-email later.
--
--   * email is UNIQUE + case-insensitively stored (lower(email)) so
--     repeat signups are idempotent.
--   * source distinguishes which CTA captured the address
--     ('footer', 'research', 'market-map', …) — handy for attribution.
--   * status is free-text with a CHECK vocab so we can track double
--     opt-in or provider sync state when we wire a real ESP.
--
-- RLS: wide open INSERT (captures from anon visitors), super-admin-only
-- SELECT / UPDATE / DELETE. Same pattern as 016_submissions.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  newsletter_signup_id bigserial PRIMARY KEY,
  email                text        NOT NULL,
  email_lower          text        GENERATED ALWAYS AS (lower(email)) STORED,
  source               text        NOT NULL DEFAULT 'footer',
  status               text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'synced', 'unsubscribed', 'bounced')),
  submitted_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_signups_email_lower
  ON public.newsletter_signups (email_lower);

CREATE INDEX IF NOT EXISTS idx_newsletter_signups_created
  ON public.newsletter_signups (created_at DESC);

CREATE OR REPLACE FUNCTION public.newsletter_signups_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_signups_set_updated_at ON public.newsletter_signups;
CREATE TRIGGER newsletter_signups_set_updated_at
  BEFORE UPDATE ON public.newsletter_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.newsletter_signups_set_updated_at();

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_signups_insert_anyone ON public.newsletter_signups;
CREATE POLICY newsletter_signups_insert_anyone
  ON public.newsletter_signups
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS newsletter_signups_select_superadmin ON public.newsletter_signups;
CREATE POLICY newsletter_signups_select_superadmin
  ON public.newsletter_signups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS newsletter_signups_update_superadmin ON public.newsletter_signups;
CREATE POLICY newsletter_signups_update_superadmin
  ON public.newsletter_signups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS newsletter_signups_delete_superadmin ON public.newsletter_signups;
CREATE POLICY newsletter_signups_delete_superadmin
  ON public.newsletter_signups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

COMMENT ON TABLE public.newsletter_signups IS
  'Newsletter signup intake from <NewsletterBanner /> (CAN-NEW-05). '
  'Ships with in-house storage until a provider (Substack/ConvertKit) is wired.';

NOTIFY pgrst, 'reload schema';

COMMIT;
