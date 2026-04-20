# Agent: final-docs

## Goal

Bring root `README.md` and `CLAUDE.md` fully in sync with the code after the post-deploy polish wave. Nothing to do with live URLs (already filled in); this is about reflecting all the UX + visual changes that landed after `docs-polish` ran the first time.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- `README.md` and `CLAUDE.md` were written before these features landed:
  - Harmonised band palette (violet → periwinkle, `apps/web/src/lib/bands.ts`)
  - Particle-stream arcs with varied altitudes (`apps/web/src/components/Globe.tsx`)
  - Reverse-geocoding on peer lock (`apps/web/src/lib/geocode.ts`) + city / flag in the PeerBanner
  - Peer-lock toggle — click same station to clear, Esc clears, click empty globe clears
  - Subsolar point as an HTML element (replaces the orange capsule)
  - Worker switched from cursor-based to sliding-window ingest (`apps/worker/src/wspr.ts` — function renamed `fetchSpotsSince` → `fetchRecentSpots`)
  - Arc cap bumped 250 → 800; SSR spot-fetch limit bumped 500 → 2000
- `CLAUDE.md` already has a "Shipped features" section — it just needs updating, not adding.

## Instructions

1. Read: `README.md`, `CLAUDE.md`, `apps/web/src/lib/bands.ts`, `apps/web/src/lib/geocode.ts`, `apps/web/src/lib/sun.ts`, `apps/web/src/components/Globe.tsx`, `apps/web/src/components/Dashboard.tsx`, `apps/worker/src/wspr.ts`, `apps/worker/src/index.ts`.

2. Update `README.md` (keep under ~100 lines):
   - "Features" bullets should reflect:
     - Particle-stream arcs at varied altitudes
     - Reverse-geocoded peer lock (city + flag + coords)
     - Keyboard / click-empty-globe escape from peer lock
     - Subsolar point as a glowing ☀ element
   - Leave live URLs untouched.

3. Update `CLAUDE.md`:
   - Correct the "Globe" subsection under Shipped features:
     - Terminator description stays (still shipped via two-element pathColor accessor).
     - Add: "Arcs stream as ~125 micro-particles per great-circle, stroke 0.1, dash/gap tuned for density. Per-arc altitude = `0.05 + (dist/20000) * 0.55 + bandBoost` so similar-distance arcs stratify by band."
     - Replace any remaining "orange capsule" / point-based description of the sun with the htmlElement version.
   - Update "Peer lock" subsection:
     - Add: "Click the same locked station to toggle off. Press `Esc` or click empty globe as alternatives. On lock, the banner shows the station's city + country flag via `reverseGeocode()` (BigDataCloud, cached, ~0.1° keyed)."
   - In the "Worker" subsection, replace `fetchSpotsSince` with `fetchRecentSpots`. Note: sliding 3-min window + upsert-ignore-by-id; this fixed a cursor race that silently dropped >99% of WSPR traffic under real load (see commit `21d1a50`).
   - In `bands.ts` subsection: call out the harmonised palette (uniform L*/chroma, violet → periwinkle walk).

4. Commit with:
   ```
   docs: sync README + CLAUDE.md with post-deploy polish
   ```

## Inputs

- Root `README.md`, `CLAUDE.md`
- `apps/web/src/lib/{bands,geocode,sun,grid}.ts`
- `apps/web/src/components/{Globe,Dashboard,SpotFeed,StatsPanel,SpaceWeather,SettingsForm}.tsx`
- `apps/worker/src/{index,wspr,supabase,env}.ts`

## Outputs

- `README.md` (modified)
- `CLAUDE.md` (modified)
- One git commit on `main`

## Acceptance criteria

- Every shipped feature in the repo is mentioned in CLAUDE.md's "Shipped features" with accurate file pointers.
- No references to `fetchSpotsSince`, sun-point-capsule, or old palette colours.
- README "Features" bullets match what a user actually sees on the site.
- Files compile / typecheck unchanged.
