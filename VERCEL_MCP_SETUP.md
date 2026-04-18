# Vercel MCP Setup for Cursor

This project ships with the **Vercel MCP server** wired into
`.cursor/mcp.json` alongside the Supabase one.

Vercel exposes a hosted remote MCP endpoint at `https://mcp.vercel.com`
that uses OAuth for authentication — you don't need to paste a token
into any config file. Cursor handles the sign-in flow on first use.

The hosted MCP is available on every Vercel plan including **Hobby (free)**.

---

## 1. Make sure Cursor sees the server

The `.cursor/mcp.json` at the repo root already contains:

```json
"vercel": {
  "url": "https://mcp.vercel.com"
}
```

Open Cursor → **Settings** → **MCP Servers** (or `Cmd+,` and search
"MCP"). You should see **vercel** listed as a remote server.

## 2. First-time sign-in

1. Toggle the **vercel** server **on**.
2. Cursor opens a browser tab asking you to sign in to Vercel and grant
   the MCP read access to your account.
3. Pick the team you want the agent to inspect (the team that owns the
   `canhav-research` project) and click **Authorize**.
4. Return to Cursor — the server now shows as connected and the agent
   can call its tools.

## 3. What the agent can now do

Read-only by default (no destructive operations without explicit confirmation):

- **Deployments**: list recent deployments for a project, read their
  status, URLs, and commit SHAs.
- **Build logs**: fetch build output for a given deployment id.
- **Runtime logs**: tail runtime logs for a deployment / function.
- **Domains**: list domains assigned to a project and their verification
  state.
- **Environment variables**: list env var keys (not values) per
  environment.

This is enough to answer questions like:

> "Did the last deploy succeed?"
> "What's in the build log for canhav-research's preview?"
> "Is ADMIN_AUTH_TOKEN set on production?"

## 4. Scoping to a specific team or project (optional)

If you want to reduce the OAuth scope to a single team or project, change
the URL in `.cursor/mcp.json` to:

```json
"vercel": {
  "url": "https://mcp.vercel.com/<team-slug>/<project-slug>"
}
```

Replace the placeholders with your Vercel team slug (e.g.
`wazarat-projects`) and the project slug for the canhav site.

## 5. Rotating access

To revoke the MCP's access, go to
<https://vercel.com/account/integrations> and remove the **Vercel MCP**
integration. Next time you toggle the server on in Cursor you'll be
prompted to authorize again.

## Local env var (optional, not used by Cursor)

If you ever need to call the Vercel REST API yourself (e.g. from a
Node script), add a token in `.env.local`:

```bash
VERCEL_TOKEN=<token-from-vercel.com/account/tokens>
```

The MCP itself doesn't need this file — it uses OAuth.
