# Agent: publish-urls (Wave 2)

## Goal

After the human deploys to Railway + Vercel and configures Supabase auth redirects, inject the live URLs into `README.md` and `CLAUDE.md` and commit.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Wave 2 runs only after the human has:
  - Deployed the worker to Railway (from `railway.toml`) and confirmed `skywave.poll.ok` logs.
  - Deployed the web app to Vercel (Root Directory = `apps/web`) with env vars.
  - Added the Vercel production + preview origins to Supabase → Authentication → URL Configuration → Additional Redirect URLs.
- Expected environment variables when this agent runs:
  - `VERCEL_URL` — e.g. `https://skywave-foo.vercel.app` (no trailing slash)
  - `RAILWAY_URL` — the Railway service URL if it has one (worker is headless so this may be a project/service name instead; accept either)
- Supabase MCP is configured on this project — the agent can run `select count(*) from spots` via MCP if desired.

## Instructions

1. Read both `VERCEL_URL` and `RAILWAY_URL` from env. If either is empty, print the expected variables and exit with a clear error message so the human can re-run.
2. In `README.md`, replace `Vercel: <pending>` with `Vercel: $VERCEL_URL` and `Railway: <pending>` with `Railway: $RAILWAY_URL`.
3. In `CLAUDE.md`, find the "Live URLs" or deploying section and substitute the same pair.
4. Verify the worker is ingesting by running a quick SQL check (`select count(*), max(observed_at) from spots where observed_at > now() - interval '5 minutes'`) either via `psql` with `DATABASE_URL` or by printing a reminder for the human to eyeball the Supabase dashboard.
5. Commit with:
   ```
   deploy: live URLs
   ```
6. Print the final commit hash and the URLs as a summary.

## Inputs

- `README.md`, `CLAUDE.md`
- `$VERCEL_URL`, `$RAILWAY_URL` from environment

## Outputs

- `README.md` (URL substitution)
- `CLAUDE.md` (URL substitution)
- One git commit on `main`

## Acceptance criteria

- Both files reference the live URLs (no `<pending>` remains).
- `git log --oneline | head -1` shows `deploy: live URLs`.
- Worker is observably ingesting in the last 5 min (spot count moves).
