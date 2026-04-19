-- 016_submissions.sql
-- Milestone 5 / CAN-NEW-10: "Submit a company" form.
--
-- Lightweight entry table that captures user-submitted company leads from
-- /submit-company. The admin flow already has all the context it needs to
-- review and either promote to a real entity or reject — this is just the
-- intake queue, no further automation.
--
-- Kept intentionally flat:
--   * `name` and `website` are required
--   * `subsector_id` is optional (user picks from a dropdown, unknown = NULL)
--   * `submitted_by` references auth.users when the submitter is signed in,
--     NULL for anonymous submits
--   * `status` is a free-text column with a small CHECK vocabulary so new
--     states (e.g. "converted") can be added without a migration
--
-- RLS:
--   * Anonymous users can INSERT (captures gaps from public article readers).
--     We rate-limit via a per-IP hash — enforced at the API layer, not RLS.
--   * Only super-admins can SELECT / UPDATE / DELETE.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

CREATE TABLE IF NOT EXISTS public.submissions (
  submission_id  bigserial PRIMARY KEY,
  name           text        NOT NULL,
  website        text        NOT NULL,
  subsector_id   integer     REFERENCES public.subsectors(subsector_id) ON DELETE SET NULL,
  notes          text,
  submitted_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email text,
  source         text        NOT NULL DEFAULT 'market-map',
  status         text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected', 'converted')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status  ON public.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions (created_at DESC);

-- keep updated_at fresh on UPDATE
CREATE OR REPLACE FUNCTION public.submissions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS submissions_set_updated_at ON public.submissions;
CREATE TRIGGER submissions_set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.submissions_set_updated_at();

-- RLS: anyone may INSERT; only super-admins may read/update/delete.
-- The API layer enforces rate limiting + validation so the permissive
-- insert policy here is deliberately wide.
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submissions_insert_anyone ON public.submissions;
CREATE POLICY submissions_insert_anyone
  ON public.submissions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS submissions_select_superadmin ON public.submissions;
CREATE POLICY submissions_select_superadmin
  ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS submissions_update_superadmin ON public.submissions;
CREATE POLICY submissions_update_superadmin
  ON public.submissions
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

DROP POLICY IF EXISTS submissions_delete_superadmin ON public.submissions;
CREATE POLICY submissions_delete_superadmin
  ON public.submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

COMMENT ON TABLE public.submissions IS
  'User-submitted company leads from /submit-company (CAN-NEW-10). '
  'Reviewed by super-admins; promotions to public.entities happen in the '
  'admin entity flow.';

NOTIFY pgrst, 'reload schema';

COMMIT;
