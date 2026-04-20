# Agent: live-verify

## Goal

Run a deeper end-to-end verification than `assessment` did — actually exercise every moving part of the live system and write `VERIFICATION.md` at the repo root with a clean / dirty verdict per subsystem. Read-only apart from that one report.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Live web: `https://skywave-web-one.vercel.app`
- Supabase project: `nsipogpfbvihfzevddrk` (MCP available)
- Railway worker: project `33a51341-1a56-4f88-a134-d2d576835b40`
- Already exists: `ASSESSMENT.md` (rubric-oriented). This agent produces a complementary operational report — **"is every subsystem alive right now?"**.
- Shipped features per CLAUDE.md "Shipped features" section.

## Instructions

1. **HTTP surface.** `curl -sI` and body checks:
   - GET `/`, `/login`, `/app`, `/app/settings` — expect 200, 200, 307→`/login`, 307→`/login`.
   - GET `/auth/callback?code=bogus` — expect a 307 back to `/login?error=auth`.
   - GET `/_next/static/chunks/*.js` for a handful of chunks; verify one of them contains the anon JWT (`eyJ…`, len > 200) baked in, and one contains the Supabase URL host `nsipogpfbvihfzevddrk.supabase.co`. Fail if anon JWT is absent or truncated.

2. **Backend data path.** Via Supabase MCP `mcp__supabase__execute_sql`:
   - `spots` row count in last 1 / 5 / 30 min — expect non-zero on each.
   - `select (now() - max(observed_at))` — report the lag; fail if > 3 min.
   - `select count(distinct band) from spots where observed_at > now() - interval '5 minutes'` — fail if < 3.
   - `select count(*) from user_preferences` — log, don't fail.
   - `select count(*) from spots where power_dbm is null or distance_km is null` — should be small; worker null-handling sanity.

3. **External API CORS.** `curl -H "Origin: https://skywave-web-one.vercel.app" -I` the two third-party endpoints the browser hits and check `access-control-allow-origin`:
   - `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
   - `https://api-bdc.net/data/reverse-geocode-client?latitude=41.8&longitude=-87.6&localityLanguage=en`

4. **RLS enforcement.** Direct anon-key REST hit — build URL from `apps/web/.env.local` (read, don't log the key). Confirm:
   - `GET /rest/v1/spots?select=id&limit=1` with anon key and no auth cookie returns empty or an unauthorized-style count (RLS policy `spots_read_authenticated` should block).
   - `GET /rest/v1/user_preferences?select=user_id` with anon key returns empty (RLS policy `prefs_self_*` requires matching `auth.uid()`).

5. **Build / typecheck.**
   - `cd apps/web && npx next build` — exit 0.
   - `npm run typecheck --workspace apps/worker` — exit 0.

6. **`VERIFICATION.md`** at repo root. Structure:
   - Header: timestamp + summary (e.g. "✅ all checks pass" or "⚠️ 2 warnings, 0 failures").
   - **HTTP surface** — table of route, expected status, actual, verdict.
   - **Backend data path** — numbers + verdict.
   - **External APIs** — CORS + 200 status per endpoint.
   - **RLS** — anon-key read attempts + verdict.
   - **Build / typecheck** — exit codes.
   - **Failures / warnings** — bulleted with reproduction hints.
   - **What this does NOT verify** — call out anything requiring a real browser (magic-link email delivery, actual Realtime WS subscription behaviour, three.js rendering). Suggest the user confirm manually.

7. Do not commit. Print the path on stdout.

## Inputs

- Repo (read-only)
- Supabase MCP tools
- `apps/web/.env.local` (read-only; use the anon key for the RLS test, never log it)
- `curl`

## Outputs

- `VERIFICATION.md` (new, uncommitted)

## Acceptance criteria

- Every subsystem listed above has a ✅ or ❌ row with concrete evidence (status code, row count, CORS header).
- Report is under 200 lines.
- If anything is broken, the report names the exact fix (e.g. "Supabase Site URL missing — set at dashboard → Authentication → URL Configuration").
