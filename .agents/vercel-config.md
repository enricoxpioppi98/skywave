# Agent: vercel-config

## Goal

Make Vercel deployment of `apps/web/` explicit and idempotent. Replace the create-next-app stub README with a skywave-specific one.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Web app at `apps/web/`. Next.js 16.2.4 + Tailwind 4 + `@supabase/ssr`. Root-level `package.json` uses npm workspaces.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (Public values; see `apps/web/.env.example`.)
- `apps/web/README.md` is still the create-next-app default.
- Vercel auto-detects Next.js, but for monorepos we need Vercel's dashboard "Root Directory" = `apps/web`. A minimal `vercel.json` is optional; including one makes intent explicit and avoids drift.
- Rubric requires: "Deployed to Vercel (frontend)".

## Instructions

1. Read:
   - `apps/web/package.json`
   - `apps/web/next.config.ts`
   - `apps/web/.env.example`
   - `apps/web/README.md`
2. Create `apps/web/vercel.json` with minimal explicit config:
   ```json
   {
     "framework": "nextjs",
     "installCommand": "npm install --workspaces",
     "buildCommand": "npm run build --workspace apps/web"
   }
   ```
   If Vercel requires a different shape for monorepos in 2026 (e.g., Turbo-specific), check current docs and adjust. Goal is explicitness.
3. Rewrite `apps/web/README.md` (replace entirely, under 50 lines):
   - One-line description: skywave's web surface.
   - Local dev: `cd apps/web && npm run dev`.
   - Env vars table pointing to `apps/web/.env.example`.
   - Vercel deploy: "Import the GitHub repo → set Root Directory to `apps/web` in the Vercel dashboard → add env vars from the table above → deploy. Supabase Realtime works over WSS automatically."
   - Note: Supabase auth email redirect must include the Vercel production + preview origins. Add to Supabase dashboard → Authentication → URL Configuration → Additional Redirect URLs.
4. Verify `cd apps/web && npx next build` still passes.
5. Commit with:
   ```
   deploy: Vercel config + web README
   ```

## Inputs

- `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/.env.example`, `apps/web/README.md`

## Outputs

- `apps/web/vercel.json` (new)
- `apps/web/README.md` (rewritten)
- One git commit on `main`

## Acceptance criteria

- `cd apps/web && npx next build` exits 0.
- `apps/web/README.md` starts with a skywave-specific description (not "Create Next App").
- Env vars documented with their source.
- A grader can deploy to Vercel from the README alone.
