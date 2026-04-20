-- 019_admin_edits_audit.sql
-- Admin audit trail
--
-- Adds:
--   1. public.admin_edits     — every inline edit (entity / classification /
--                               subsector_data) writes one row with before /
--                               after values, so super-admins can review
--                               what other admins changed.
--   2. entity_merges.merged_by_user_id  — FK to auth.users so merges tie
--      back to a real admin, not just the email string. Legacy rows keep
--      their NULL value and we continue to rely on `merged_by` (text) for
--      display.
--
-- RLS:
--   - Only admins can INSERT into admin_edits (via service-role-backed API
--     routes today, but we still set RLS so ad-hoc SQL use is safe).
--   - admin → select own rows.
--   - super_admin → select all rows.
--   - No UPDATE / DELETE from the app; use service role if history ever
--     needs to be pruned.

BEGIN;

-- -----------------------------------------------------------------------
-- 1) admin_edits table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_edits (
  edit_id        bigserial PRIMARY KEY,
  actor_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email    text        NOT NULL,
  actor_role     text        NOT NULL CHECK (actor_role IN ('admin', 'super_admin')),
  -- What kind of object was touched, and which row.
  target_type    text        NOT NULL CHECK (target_type IN (
                                'entity',
                                'classification',
                                'subsector_data'
                             )),
  target_id      bigint      NOT NULL,
  -- Convenience denormalisation so super-admins can filter by entity
  -- without joining across tables at query time. Nullable because the
  -- subsector_data tables are dynamic and we don't always know the
  -- root entity up-front (see app-layer fill).
  entity_id      bigint,
  -- { fieldName: { before: <any>, after: <any> } }  — before/after values
  -- for the columns the admin actually changed. Small diffs only; not the
  -- full row.
  changes        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Optional free-text context e.g. "Fixing HQ" or "batch import"
  note           text,
  source         text,                                     -- 'drawer'|'full_page'|'api'
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_edits_created_at
  ON public.admin_edits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_edits_actor_created
  ON public.admin_edits (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_edits_target
  ON public.admin_edits (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_edits_entity
  ON public.admin_edits (entity_id);

ALTER TABLE public.admin_edits ENABLE ROW LEVEL SECURITY;

-- admin_edits_select_own: any admin can see their own edits.
DROP POLICY IF EXISTS admin_edits_select_own ON public.admin_edits;
CREATE POLICY admin_edits_select_own
  ON public.admin_edits
  FOR SELECT
  TO authenticated
  USING (
    actor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- admin_edits_select_super: super-admins see everything.
DROP POLICY IF EXISTS admin_edits_select_super ON public.admin_edits;
CREATE POLICY admin_edits_select_super
  ON public.admin_edits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
    )
  );

-- admin_edits_insert_admin: any admin can write their own row. Writes go
-- through the service-role API today, but we keep this so a logged-in
-- admin could ever sign a row themselves (future-proofing).
DROP POLICY IF EXISTS admin_edits_insert_admin ON public.admin_edits;
CREATE POLICY admin_edits_insert_admin
  ON public.admin_edits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- 2) entity_merges.merged_by_user_id  (FK-backed actor link)
-- -----------------------------------------------------------------------
ALTER TABLE public.entity_merges
  ADD COLUMN IF NOT EXISTS merged_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.entity_merges
  ADD COLUMN IF NOT EXISTS reverted_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entity_merges_merged_by_user
  ON public.entity_merges (merged_by_user_id);

COMMIT;
