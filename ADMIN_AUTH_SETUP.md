# Admin Auth — one-time setup

The `/admin/*` editorial tools (merge candidates, editor management) are
gated by **Supabase Auth + `public.admin_users`**. The public site stays
fully accessible without login; only these paths require sign-in:

```
/admin/*            -> page requires sign-in + admin_users row
/api/admin/*        -> API requires sign-in + admin_users row
```

Two ways to sign in:

1. **Continue with Google** — Gmail or any Google Workspace account.
2. **Email sign-in link** — Outlook, Hotmail, iCloud, work email, any
   inbox. Supabase emails a one-click link. This is also the fallback
   if Google OAuth is ever broken.

You only need to do this once per Supabase project (eth-data). All the
code is already wired up.

---

## 1. Enable Google in the Supabase dashboard

Open the **eth-data** project → **Authentication → Sign In / Providers**.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create a new **OAuth 2.0 Client ID** (Application type: *Web
   application*).
2. Add this authorised redirect URI (Supabase shows the exact URL on the
   Google provider page — copy from there to be safe):
   ```
   https://ekezgvoburmfjmkdzjhq.supabase.co/auth/v1/callback
   ```
3. Copy the **Client ID** and **Client Secret** into Supabase's Google
   provider settings → Save.

Email is already enabled by default — there is nothing to configure for
the email-magic-link flow beyond whitelisting the redirect URL below.

---

## 2. Whitelist site URLs

Same dashboard → **Authentication → URL Configuration**.

- **Site URL:** `https://www.canhav.com`
- **Redirect URLs** (add all three):
  ```
  http://localhost:3000/api/auth/callback
  https://www.canhav.com/api/auth/callback
  https://canhav-research-*.vercel.app/api/auth/callback
  ```
  The wildcard entry covers preview deploys. Supabase supports `*` in
  the path segment for preview URLs.

> The callback lives at `/api/auth/callback` (an API route) on purpose.
> Next's pages router would otherwise try to prerender it as a React
> component — which crashes the build.

---

## 3. Seed the first super-admin

The allow-list starts empty, so after you sign in once with Google
(or via the email link) a super-admin needs to promote you. Since you
*are* the first admin, we seed your row directly. Run this in the
Supabase SQL editor **after your first sign-in**:

```sql
-- 1. Find the auth.users row created by your first sign-in:
SELECT id, email, created_at
FROM auth.users
WHERE email = 'waz@canhav.com'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Copy the id from the row above and run:
INSERT INTO public.admin_users (user_id, email, role, notes)
VALUES (
  '<paste-user-id-here>',
  'waz@canhav.com',
  'super_admin',
  'Initial super-admin, seeded 2026-04-18'
)
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, email = EXCLUDED.email;
```

From then on you can add / remove other editors entirely through
[`/admin/members`](https://www.canhav.com/admin/members). New editors
you invite by email will get a Supabase invitation link in their inbox
(works for Gmail, Outlook, Hotmail, work email, etc.).

---

## 4. Vercel env vars

The app reuses the eth-data Supabase creds it already has. No new env
vars are required, but double-check these exist on the Vercel project:

- `NEXT_PUBLIC_ETHDATA_SUPABASE_URL`
- `NEXT_PUBLIC_ETHDATA_SUPABASE_ANON_KEY`
- `NEW_SUPABASE_SERVICE_ROLE_KEY` (server-only, used by admin APIs)

Optional:

- `NEXT_PUBLIC_SITE_URL=https://www.canhav.com` — only needed if you're
  running invites in a context where the request headers don't include
  `host` (rare).

The old `ADMIN_AUTH_TOKEN` can be **deleted** from Vercel — it's no
longer read anywhere.

---

## 5. Local dev

1. `npm install` (installs `@supabase/ssr`).
2. Copy `.env.local.example` → `.env.local`, fill in the Supabase creds.
3. `npm run dev` → visit http://localhost:3000/admin/entities → you'll
   bounce to `/admin/login` → click *Continue with Google* (or send
   yourself an email link).
4. First sign-in in dev also counts for production, since auth users
   are per-project, not per-environment. Run the seed SQL above once
   and you're in.

---

## 6. Who can do what

| Action                                     | `admin` | `super_admin` |
| ------------------------------------------ | ------- | ------------- |
| Browse `/admin/entities` merge candidates  | ✅      | ✅            |
| Apply merges, unmerge, never-merge flags   | ✅      | ✅            |
| View the editor list at `/admin/members`   | ✅      | ✅            |
| Add / remove editors, change roles         | ❌      | ✅            |

The last super-admin can't remove themself (guard in the API) so you
always have a way back in.

---

## 7. Adding Microsoft / Azure later (optional)

We intentionally skipped Azure AD for now — Outlook and Hotmail users
can already sign in via the email link, which is zero-setup. If you
later want native "Continue with Microsoft" SSO:

1. Register an app at [portal.azure.com → Azure AD → App registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
2. In Supabase dashboard → Authentication → Providers → Azure, paste
   the client ID + secret + tenant (`common` for consumer accounts).
3. Re-add a `<button onClick={() => supabase.auth.signInWithOAuth({
   provider: 'azure', ... })}>` to `pages/admin/login.tsx`.

The rest of the stack (callback, middleware, admin_users) already
handles arbitrary OAuth providers — only the UI needs the extra button.
