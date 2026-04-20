# Agent: worker-health-footer

## Goal

Add a tiny "worker heartbeat" indicator in the dashboard that shows the system is alive — the last-spot age and the current ingestion rate — so a grader sees at a glance that data is flowing.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Dashboard at `apps/web/src/components/Dashboard.tsx` already has a status dot (connecting / live / error) for the realtime WS subscription in the left-rail header.
- What's missing: a stats-style indicator for the backend ingestion itself — e.g., "last poll 12s ago · 2300 spots/30m · 789 stations".
- Data is cheap to derive on the client: we already have `spots` state with `observed_at` on each row. Compute `now - max(observed_at)` for lag and the count for the window rate.
- The Assignment 4 rubric stretch goals list "Worker health monitoring (last poll time, error count on frontend)". This adds the last-poll-time piece without a new DB call.

## Instructions

1. Read `apps/web/src/components/Dashboard.tsx` and `apps/web/src/components/StatsPanel.tsx`.

2. Create a new component `apps/web/src/components/WorkerHealth.tsx` (client component, ~60 lines):
   - Props: `spots: Spot[]` (unfiltered, so the rate reflects full ingest, not the band-filtered view).
   - Compute:
     - `lastSpotAgeSec` = floor((now - max(observed_at)) / 1000). If no spots, `null`.
     - `spotsInLast5Min` = count of spots where observed_at > now - 5m.
     - `uniqueStations` = new Set(spots.flatMap(s => [s.rx_sign, s.tx_sign])).size.
   - Render a compact row (mono, 10px text): a small pulsing dot + "worker" + "last spot Ns ago · N spots/5m · N stations". Color-code the dot:
     - Green (accent) if lastSpotAgeSec < 60
     - Amber (accent-warm) if 60 ≤ lastSpotAgeSec < 180
     - Red (accent-hot) if ≥ 180 or null
   - Tick the "now" via `useState` + `setInterval(_, 5000)` for fresh age text (mirror SpotFeed's pattern; client-only mount to avoid SSR hydration drift).

3. Mount the component in `Dashboard.tsx`: below the `SpaceWeather` component in the right rail (or in the left-rail header above the spot feed). Pass the raw `spots` (not `filtered`).

4. Verify `cd apps/web && npx next build` passes.

5. Commit with:
   ```
   feat: worker-health footer — shows last poll age + 5m rate + stations
   ```

## Inputs

- `apps/web/src/components/Dashboard.tsx`
- `apps/web/src/components/StatsPanel.tsx` (reference for style / layout)
- `apps/web/src/lib/types.ts` (for the `Spot` type)

## Outputs

- `apps/web/src/components/WorkerHealth.tsx` (new)
- `apps/web/src/components/Dashboard.tsx` (modified — import + render)
- One git commit on `main`

## Acceptance criteria

- Build passes.
- On the live site, the new indicator updates every ~5s and reflects actual data.
- Dot turns amber/red if ingestion stalls (can be smoke-tested by briefly pausing the Railway service).
- No new network calls — all from in-memory `spots`.
