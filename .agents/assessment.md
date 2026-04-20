# Agent: assessment

## Goal

Run an end-to-end audit of the deployed skywave system and produce `ASSESSMENT.md` at the repo root: a grader-ready report listing pass/fail against each rubric line + any live-site issues the user should fix before recording the video.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Live web: `https://skywave-web-one.vercel.app`
- Supabase project: `nsipogpfbvihfzevddrk` (MCP available)
- GitHub: `https://github.com/enricoxpioppi98/skywave`
- Assignment rubric (from `Assignment 4.pdf`, one level up):
  - Monorepo (`apps/web`, `apps/worker`)
  - Next.js + Tailwind
  - Worker on Railway polling an external API
  - Data in Supabase (worker writes, frontend reads)
  - Supabase Realtime pushing updates
  - Auth via Clerk or Supabase Auth
  - User personalization (favorites / preferences)
  - Env vars in `.env.local` and platform dashboards
  - Supabase MCP configured
  - `CLAUDE.md` describing architecture
  - Multiple git commits showing iteration
  - Deployed to Vercel + Railway
  - Live URLs work; classmates can sign up

## Instructions

1. **Repo audit** (read-only; no commits from this agent):
   - `git log --oneline | wc -l` → commit count
   - Confirm `apps/web/.env.local` and `apps/worker/.env.local` are in `.gitignore` output of `git check-ignore` (they should be)
   - `grep -r "sb_secret_\|service_role" apps README.md CLAUDE.md 2>/dev/null` → no matches expected
   - Confirm `railway.toml`, `apps/web/README.md`, `apps/worker/README.md`, root `README.md`, `CLAUDE.md` exist

2. **Live-site smoke test** via `curl`:
   - GET `/` → 200 + contains "skywave"
   - GET `/login` → 200
   - GET `/app` → 307 (redirect; OK when unauthenticated)
   - Pull a few `_next/static/chunks/*.js` and confirm the anon JWT (`eyJ…`, length > 200) is present — that's the NEXT_PUBLIC_SUPABASE_ANON_KEY baked into the client bundle.

3. **Backend liveness** via Supabase MCP (`mcp__supabase__execute_sql`):
   - `select count(*), count(distinct rx_sign), count(distinct tx_sign), count(distinct band) from spots where observed_at > now() - interval '5 minutes'` — expect non-zero on every column.
   - `select (now() - max(observed_at)) as lag from spots` — lag should be < 2 minutes.
   - `select count(*) from user_preferences` — confirms at least one user has signed in (RLS path exercised).

4. **CORS sanity**:
   - Verify `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` responds 200.
   - Verify `https://api-bdc.net/data/reverse-geocode-client?latitude=41.8&longitude=-87.6&localityLanguage=en` responds 200 with a `city` field.

5. **Dependency / code health**:
   - `cd apps/web && npx next build` — exit 0.
   - `npm run typecheck --workspace apps/worker` — exit 0.

6. **Documentation check**:
   - `CLAUDE.md` must mention: architecture, shipped features, deployment steps, and live URLs.
   - Root `README.md` must mention: live URLs, quickstart, tech stack.

7. **Produce `ASSESSMENT.md`** at the repo root with these sections:
   - **Live URLs** (verified links)
   - **Rubric checklist** — one row per rubric item, ✅/⚠️/❌ + one-line evidence
   - **Backend health** — current spot count, unique stations, worker lag
   - **Known good** — what's confirmed working
   - **Known issues / risks** — anything the audit flagged (e.g., CORS, Supabase redirects not set, etc.)
   - **Recommended action items before submission** — ordered short list (typically 1–3 items)
   - **Suggested talking points for the Slack reflection video** — 3–5 bullet highlights drawn from the actual code (e.g., "sliding-window ingest to dodge wspr.live's out-of-order publication")

8. Do **not** commit. Print the assessment filename on stdout so the caller knows where to look. The user will review and commit or revise.

## Inputs

- Entire repo (read-only)
- Supabase MCP tools
- `curl` for live checks

## Outputs

- `ASSESSMENT.md` (new, uncommitted)

## Acceptance criteria

- File exists at `./ASSESSMENT.md` and is < 250 lines.
- Every rubric row has a status marker and evidence.
- Backend health numbers are current (ran within the last minute).
- Action items are concrete and the user can do them in < 10 min each.
