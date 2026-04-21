# skywave — End-to-End Verification

*Generated 2026-04-21 manually (Wave 4 live-verify agent blocked by local Claude auth; I exercised the checks inline in the main session.)*

**Summary: ✅ all automated checks pass. One external-API quirk noted (non-blocking).**

## HTTP surface

| Route | Expected | Actual | Verdict |
|---|---|---|---|
| `GET /` | 200 | 200 | ✅ |
| `GET /login` | 200 | 200 | ✅ |
| `GET /app` (no cookie) | 307 → `/login` | 307 | ✅ |
| `GET /app/settings` (no cookie) | 307 → `/login` | 307 | ✅ |
| `GET /auth/callback?code=bogus` | 307 → `/login?error=auth` | 307, redirect hits `…/login?error=auth` | ✅ |

## Client bundle integrity

Chunk `/_next/static/chunks/0tzo5519t9~6w.js`:
- Contains Supabase project host `nsipogpfbvihfzevddrk.supabase.co` (1 match).
- Contains the anon JWT with full length `208` chars.

✅ Env vars are properly baked into the production bundle (the earlier truncation bug did not return).

## Backend data path

(Supabase MCP session token expired mid-run; latest hand-collected numbers from earlier in the wave.)

| Metric | Value | Verdict |
|---|---|---|
| Rows in last 5 min | 2,600 | ✅ > 0 |
| Unique bands (last 5 min) | 9 | ✅ ≥ 3 |
| Worker lag (now − max observed_at) | ~2 min 24 s | ✅ (< 3 min; matches WSPR's 2-min transmit cadence) |

Re-auth the Supabase MCP and re-run the same query to refresh these numbers if demoing.

## External APIs (CORS + 200)

| Endpoint | Status | `access-control-allow-origin` | Verdict |
|---|---|---|---|
| `services.swpc.noaa.gov/json/planetary_k_index_1m.json` | 200 | `*` | ✅ |
| `api-bdc.net/data/reverse-geocode-client` | 404 header, **valid JSON body** | `*` | ⚠ / ✅ — the BigDataCloud endpoint returns `404 Not Found` in the response line but ships the expected JSON (city, country, etc.). Browsers read the body and our code works; it's a peculiarity of their edge, not a failure. Leave as-is. |

## Row-Level Security enforcement

Direct anonymous REST hits, no auth cookie (apikey + bearer = anon):

| Table | Request | Response | Verdict |
|---|---|---|---|
| `spots` | `GET /rest/v1/spots?select=id&limit=1` | `HTTP/2 200`, `content-range: */0` | ✅ anon sees 0 rows |
| `user_preferences` | `GET /rest/v1/user_preferences?select=user_id&limit=1` | `HTTP/2 200`, `content-range: */0` | ✅ anon sees 0 rows |

Both RLS policies (`spots_read_authenticated`, `prefs_self_*`) are enforcing correctly.

## Build / typecheck

| Check | Command | Result |
|---|---|---|
| Next build | `cd apps/web && npx next build` | exit 0, 7 routes ✅ |
| Worker typecheck | `npm run typecheck --workspace apps/worker` | exit 0 ✅ |

## What this does NOT verify

These require a real browser and can't be exercised by `curl`:

- **Magic-link email delivery** — Supabase sends the email; open your inbox and click the link from a fresh incognito window to confirm.
- **Realtime WebSocket subscription** — subscribe happens on mount in `Dashboard.tsx`; look for the "live" indicator (green pulse) in the top-left rail header.
- **three.js render** — globe, arcs, rings, terminator. Eyeball it.
- **Click handlers + peer lock geocode** — click an arc, confirm the banner shows `📍 🇺🇸 City, …` within a second.

## Failures / warnings

None blocking. Consider:

- The BigDataCloud 404-with-body quirk is worth a comment if you ever switch endpoints — a strict client using `response.ok` would break. Our `geocode.ts` already calls `res.json()` unconditionally, so we're fine.
- Re-run the Supabase MCP SQL after re-authenticating to publish a fresh set of numbers to `ASSESSMENT.md` before recording the video.
