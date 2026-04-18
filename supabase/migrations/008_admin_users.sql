-- 008_admin_users.sql
-- Replaces the ADMIN_AUTH_TOKEN shared-secret with a proper auth-backed
-- admin list. A row in public.admin_users grants access to /admin/* and
-- /api/admin/*; the role column distinguishes super_admin (can promote /
-- demote others) from a regular admin (can only use the merge tools).
--
-- Notes:
--   * user_id FKs auth.users so deleting a Supabase user cascades.
--   * email is duplicated from auth.users for easy display; kept in sync
--     on insert by the /api/admin/members endpoint. The source of truth
--     is always auth.users.email.
--   * RLS is ENABLED with a permissive select policy (any admin can see
--     the admin list in the UI) and strict write policies (only
--     super_admin can add/remove rows). Service-role callers bypass RLS.
--
-- Target project: eth-data (ref ekezgvoburmfjmkdzjhq)

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     text        NOT NULL,
  role      text        NOT NULL DEFAULT 'admin'
                         CHECK (role IN ('admin', 'super_admin')),
  added_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at  timestamptz NOT NULL DEFAULT now(),
  notes     text
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_admin_users_role  ON public.admin_users (role);

COMMENT ON TABLE public.admin_users IS
  'Allow-list for the /admin editorial tools. user_id references '
  'auth.users so deleting the Supabase user revokes access.';

-- Helper: is the caller a super_admin? Used by RLS policies below so the
-- logic lives in one place. SECURITY DEFINER because the function needs
-- to read admin_users regardless of whether RLS recurses on itself.
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = uid AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can see if they're in the list (used by
-- the /admin/members page for admins to view their peers, and by the
-- session probe). Non-admins will see an empty result, which is fine.
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
CREATE POLICY admin_users_select
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: only super_admin can insert / update / delete. Service-role
-- (used by our API handlers) bypasses RLS entirely, so this is a
-- belt-and-braces policy for direct DB calls.
DROP POLICY IF EXISTS admin_users_write ON public.admin_users;
CREATE POLICY admin_users_write
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

COMMIT;
