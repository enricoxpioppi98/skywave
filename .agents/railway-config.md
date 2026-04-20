# Agent: railway-config

## Goal

Make Railway deployment of `apps/worker/` idempotent and one-command. Produce a committed Railway config file and a brief README for the worker.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Worker at `apps/worker/`. TypeScript, runs via `tsx src/index.ts` at runtime (no tsc build).
- `apps/worker/package.json` has scripts: `dev` (tsx watch, env-file), `start` (`tsx src/index.ts`), `typecheck`. `"type": "module"`. `"engines": {"node": ">=22"}`. Runtime deps include `tsx` and `@supabase/supabase-js`.
- Uses npm workspaces from root `skywave/package.json`.
- Env vars at runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `POLL_INTERVAL_SEC`, `RETENTION_HOURS`.
- Rubric requires: "Background worker deployed on Railway — polls an external data source".
- Railway supports Nixpacks auto-detection. A minimal `railway.toml` (or `nixpacks.toml`) makes the deploy configuration explicit.

## Instructions

1. Read:
   - `apps/worker/package.json`
   - `package.json` (root)
   - `apps/worker/src/index.ts`
   - `apps/worker/.env.example`
2. Decide Railway service root directory: **repo root**, with build = root `npm install` (workspaces) and start = `npm run start --workspace apps/worker`. Rationale: the worker imports from workspace-hoisted `node_modules/@supabase/supabase-js` which only exists after a root install.
3. Create `railway.toml` at the repo root:
   ```toml
   [build]
   builder = "nixpacks"

   [deploy]
   startCommand = "npm run start --workspace apps/worker"
   restartPolicyType = "always"
   ```
4. Create `apps/worker/README.md` (new file, under 40 lines), covering:
   - One-line description of what the worker does.
   - Env vars table (name · required? · default · source).
   - Local dev command: `npm run dev --workspace apps/worker`.
   - Railway deploy notes: "Connect the GitHub repo; Railway picks up `railway.toml`; set env vars in Railway dashboard from the table above."
5. Verify locally by re-running the worker in a subshell to confirm nothing breaks:
   ```sh
   cd "$REPO_ROOT" && npm run start --workspace apps/worker 2>&1 | head -5 &
   sleep 5; kill %1 2>/dev/null
   ```
   Should see `skywave.worker.boot` in output.
6. Commit with:
   ```
   deploy: Railway config + worker README
   ```

## Inputs

- `apps/worker/package.json`, `apps/worker/.env.example`, `apps/worker/src/index.ts`
- `package.json` (root)

## Outputs

- `railway.toml` (new, at repo root)
- `apps/worker/README.md` (new)
- One git commit on `main`

## Acceptance criteria

- `railway.toml` exists and `toml` parse is valid.
- `apps/worker/README.md` lists every env var with a one-line source note.
- Locally: `npm run start --workspace apps/worker` boots the worker (you'll see a `skywave.worker.boot` log line within 5 s).
- A grader following the README can deploy without guessing env var names.
