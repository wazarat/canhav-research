# Supabase MCP Setup for Cursor

This project ships with a pre-configured **Supabase MCP server** so the agent
(and you) can run DDL / DML / migrations, manage projects, auth, storage,
read logs, and generate schemas directly from Cursor.

It uses the **official** `@supabase/mcp-server-supabase` package (no
custom servers required).

---

## 1. Create a Supabase Personal Access Token (PAT)

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**, name it e.g. `cursor-mcp-canhav-research`
3. Copy the token — it looks like `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> The PAT is scoped to your Supabase **account** and can access every
> project you own. Treat it like a password.

## 2. Wire the token into `.cursor/mcp.json`

Copy the example and add your token:

```bash
cp .cursor/mcp.json.example .cursor/mcp.json
```

Then open `.cursor/mcp.json` and replace `REPLACE_WITH_YOUR_SUPABASE_PAT`
with your PAT from step 1.

`.cursor/mcp.json` is gitignored, so your token stays out of version control.
Only `.cursor/mcp.json.example` is committed.

## 3. Enable the MCP in Cursor

- Open Cursor → **Settings** → **MCP Servers** (or `Cmd+,` then search "MCP")
- You should see **supabase** listed (picked up from `.cursor/mcp.json`)
- Toggle it **on** and click **Refresh**
- Cursor will run `npx -y @supabase/mcp-server-supabase@latest` the first
  time, which downloads the server (~10 seconds)

Once green, the agent can call Supabase tools directly in chat.

## 4. What the MCP can do

With the `--features` flag set to
`database,docs,debugging,development,functions,storage,branching,account`,
the following tool groups are available:

| Feature       | What the agent can do                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| `database`    | Run DDL/DML/SQL, list tables, apply migrations, generate typed schemas                |
| `development` | Generate TypeScript types from your schema, fetch API URL + anon key                  |
| `functions`   | List / deploy / invoke Edge Functions                                                 |
| `storage`     | Create buckets, list objects, upload/download, update policies                        |
| `branching`   | Create preview branches (for destructive migrations) and merge them back              |
| `debugging`   | Read Postgres / API / Auth / Edge-Function / Realtime / Storage logs, list advisors   |
| `docs`        | Search Supabase docs from inside chat                                                 |
| `account`     | List projects & organizations, create/pause/restore projects, read project keys, etc. |

**Auth** is managed through the `database` feature (Supabase stores auth
config in the `auth` schema) and the `account` feature (GoTrue settings
via the Management API).

## 5. Optional: lock the MCP to a single project

By default the MCP can touch any Supabase project in your account. To
scope it to just the active `eth-data` project, add `--project-ref` to
the args list in `.cursor/mcp.json`:

```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase@latest",
  "--project-ref=YOUR_PROJECT_REF",
  "--features=database,docs,debugging,development,functions,storage,branching"
]
```

Your project ref is the subdomain of your Supabase URL, e.g.
`egesqobnveubddfpzrkp` in `https://egesqobnveubddfpzrkp.supabase.co`.

## 6. Safety recommendations

- For production projects, add `--read-only` to the args list until you
  explicitly want destructive changes. The agent can still read schema,
  logs, and data; it just can't run DDL/DML.
- For destructive migrations, use `--features=branching` and ask the
  agent to create a preview branch first, then merge once verified.
- Rotate the PAT after someone leaves the team.

## 7. Smoke test

Ask the agent in chat:

> List all tables in the public schema of my Supabase project.

If MCP is working it will call `list_tables` via the MCP and return
`entities`, `sectors`, `subsectors`, `entity_classifications`, `companies`, etc.
