# Admin Auth — one-time setup

The `/admin/*` editorial tools (merge candidates, editor management) are
gated by **Supabase Auth + `public.admin_users`**. The public site stays
fully accessible without login; only these paths require sign-in:

```
/admin/*            -> page requires sign-in + admin_users row
/api/admin/*        -> API requires sign-in + admin_users row
```

You only need to do this once per Supabase project (eth-data).
Everything on the code side is already wired up.

---

## 1. Enable OAuth providers in the Supabase dashboard

Open the **eth-data** project → **Authentication → Providers**.

### Google

1. In Google Cloud Console, create a new **OAuth 2.0 Client ID**
   (Application type: Web application).
2. Add authorised redirect URI:
   ```
   https://ekezgvoburmfjmkdzjhq.supabase.co/auth/v1/callback
   ```
   (Supabase shows this exact URL on the provider page — copy/paste it.)
3. Copy the **Client ID** and **Client Secret** into the Supabase Google
   provider settings, hit Save.

### Microsoft (Azure)

1. Go to [portal.azure.com → Azure AD → App registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps) → **New registration**.
2. Supported account types: **Accounts in any organisational directory
   and personal Microsoft accounts** (so Outlook.com works).
3. Redirect URI: Web →
   ```
   https://ekezgvoburmfjmkdzjhq.supabase.co/auth/v1/callback
   ```
4. After registration, open **Certificates & secrets → New client
   secret**, copy the *Value*.
5. In Supabase Authentication → Providers → Azure, paste:
   - Application (client) ID → `Client ID`
   - Client secret → `Client Secret`
   - Azure tenant URL → `https://login.microsoftonline.com/common`
     (for consumer + work accounts). Save.

### Email (magic link) — already on by default

Supabase has email magic links on by default. Nothing to change. The
login page will accept an email and send a one-click sign-in link as a
fallback when OAuth isn't configured yet.

---

## 2. Whitelist site URLs

Same dashboard → **Authentication → URL Configuration**.

- **Site URL:** `https://www.canhav.com`
- **Redirect URLs** (add all three):
  ```
  http://localhost:3000/auth/callback
  https://www.canhav.com/auth/callback
  https://canhav-research-*.vercel.app/auth/callback
  ```
  The wildcard entry covers preview deploys. Supabase supports `*` in
  the path segment for preview URLs.

---

## 3. Seed the first super-admin

The allow-list starts empty, so after you sign in once via Google /
Microsoft, a super-admin needs to promote you. Since you *are* the first
admin, we seed your row directly in the database. Run this via the
Supabase SQL editor **after your first sign-in**:

```sql
-- Find the auth.users row created by your first sign-in.
SELECT id, email, created_at
FROM auth.users
WHERE email = 'waz@canhav.com'
ORDER BY created_at DESC
LIMIT 1;

-- Copy the id from the row above and run:
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

From then on, you can add / remove other editors entirely through
[`/admin/members`](https://www.canhav.com/admin/members).

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
   bounce to `/admin/login` → click *Continue with Google / Microsoft*.
4. First sign-in in dev will also count for production, since auth users
   are per-project, not per-environment. Run the seed SQL above once and
   you're in.

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
