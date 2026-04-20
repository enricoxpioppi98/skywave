# Agent: docs-polish

## Goal

Bring the root `README.md` and `CLAUDE.md` up to date with every feature actually shipped, plus a Deploying section. A grader or classmate should be able to understand the system and run it from these two files alone.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Root `README.md` is currently a short stub with `<pending>` URL placeholders.
- `CLAUDE.md` has the original pre-implementation architecture blueprint but doesn't mention features landed after:
  - Realtime ring pulses on arriving spots
  - Subsolar (sun) point marker on globe
  - Day/night terminator (landed by the terminator-fix agent — reference as "shipped" iff that agent has committed; check git)
  - Peer lock (click an arc or rx point to "listen in" from that receiver)
  - Space weather widget (NOAA SWPC — solar flux, Kp, plain-English rating)
  - Arc cap (250) and altitude tuning (0.22)
  - Auto-rotate controls, recenter, fly-to-sun buttons
- Assignment rubric requires: "CLAUDE.md describing your architecture" + "Deployed to Vercel and Railway".

## Instructions

1. Read: root `README.md`, root `CLAUDE.md`, all files under `apps/web/src/components/`, `apps/web/src/lib/sun.ts`, `apps/web/src/lib/bands.ts`, `apps/worker/src/index.ts`, `apps/worker/src/wspr.ts`.
2. Rewrite root `README.md`, keeping it tight (target < 100 lines):
   - Title + one-line pitch
   - Live URLs section with `Vercel: <pending>` and `Railway: <pending>` (Wave 2 fills)
   - Quickstart: `npm install`, then `npm run dev:worker` (terminal 1) and `npm run dev:web` (terminal 2). Link to `apps/worker/.env.example` and `apps/web/.env.example` for required env vars.
   - Feature highlights bulleted: realtime globe with band-colored arcs, day/night terminator (if shipped), listening-post concept, peer-lock click-to-listen-in, space weather widget.
   - Short architecture snippet (one-line: external API → worker → Supabase → web, with arrow diagram).
   - Tech stack row: Next.js 16, Tailwind 4, Supabase (Postgres + Realtime + Auth + RLS), Railway, Vercel.
   - Pointer: "See `CLAUDE.md` for full architecture."
3. Update `CLAUDE.md`:
   - Keep existing architecture sections.
   - Add a new section near the top called **Shipped features** listing every feature actually in the code (read the components to verify). Mark each with where it lives, e.g. `apps/web/src/components/Dashboard.tsx` for peer lock.
   - Add a new section **Deploying** with:
     - Railway step: connect repo, `railway.toml` at root handles build/start; set env vars (list).
     - Vercel step: import repo, set Root Directory to `apps/web`, add env vars (list), Supabase auth redirect URL config.
     - Smoke test checklist.
   - Leave existing stretch-goals / non-goals sections intact.
4. Commit with:
   ```
   docs: root README + CLAUDE.md reflect shipped features and deployment
   ```

## Inputs

- `README.md`, `CLAUDE.md` (root)
- `apps/web/src/components/*.tsx`
- `apps/web/src/lib/{sun,bands,grid}.ts`
- `apps/worker/src/{index,wspr,supabase}.ts`

## Outputs

- `README.md` (rewritten)
- `CLAUDE.md` (appended sections, no deletions)
- One git commit on `main`

## Acceptance criteria

- Root `README.md` is < 100 lines and self-sufficient for quickstart.
- `CLAUDE.md` "Shipped features" matches what's actually in the components.
- No broken file paths.
- A grader can answer "what did this person build, and where does each piece live?" from `CLAUDE.md` alone.
