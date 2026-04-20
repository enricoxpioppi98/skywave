# Agent: terminator-fix

## Goal

Ship a working day/night terminator overlay on the skywave globe without triggering three-globe's `color2ShaderArr` "Cannot read properties of undefined (reading 'trim')" crash.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Tech: Next.js 16 + Tailwind 4 + `react-globe.gl@^2.37.1` (`three-globe` under the hood), React 19.
- `Globe.tsx` (at `apps/web/src/components/Globe.tsx`) currently renders arcs + points + rings. Path accessors were removed after the crash.
- Sun-position math already exists at `apps/web/src/lib/sun.ts`:
  - `subSolarPoint(date?)` returns `{lat, lon}`
  - `terminatorPath(subSolar, samples)` returns `Array<[lon, lat]>` pairs around the terminator great circle
- Previous failed attempt used:
  ```tsx
  pathsData={terminator}  // [{ path: Array<[lat, lon, alt]>, color: string }]
  pathPoints="path"
  pathPointLat={((pt) => pt[0]) as unknown as never}
  pathPointLng={((pt) => pt[1]) as unknown as never}
  pathPointAlt={((pt) => pt[2]) as unknown as never}
  pathColor={((d) => d.color) as unknown as never}  // or plain string — both crashed
  ```
  Browser threw `Cannot read properties of undefined (reading 'trim')` from `three-globe`'s internal `color2ShaderArr`.
- The likely fix: `pathColor` accessor must return `string | [string, string] | [...strings]` (per-segment gradient). A single plain `string` or an accessor that returns a plain string may be miscompared to array semantics inside three-globe. Returning `[color, color]` is safest.

## Instructions

1. Read `apps/web/src/components/Globe.tsx` in full. Read `apps/web/src/lib/sun.ts`.
2. If uncertain about the contract, inspect `node_modules/three-globe/src/layers/paths.js` (or the dist equivalent) to confirm what `pathColor` accepts.
3. Reintroduce terminator rendering in `Globe.tsx`:
   - `const TERMINATOR_COLOR = "#ffbb5c";`
   - Add a `terminator` memo: `useMemo(() => [{ path: coords }], [sunPos])` where `coords = terminatorPath(sunPos, 180).map(([lon, lat]) => [lat, lon, 0.005])`. Note: do NOT include `color` on the datum.
   - Pass to `<GlobeGL>`:
     ```tsx
     pathsData={terminator}
     pathPoints="path"
     pathPointLat={((pt: [number, number, number]) => pt[0]) as unknown as never}
     pathPointLng={((pt: [number, number, number]) => pt[1]) as unknown as never}
     pathPointAlt={((pt: [number, number, number]) => pt[2]) as unknown as never}
     pathColor={(() => [TERMINATOR_COLOR, TERMINATOR_COLOR]) as unknown as never}
     pathStroke={0.3}
     pathDashLength={0.08}
     pathDashGap={0.04}
     pathDashAnimateTime={12000}
     pathTransitionDuration={0}
     ```
   - `pathColor` returns a *two-element array* (uniform color, gradient-safe).
4. Run `cd apps/web && npx next build` and verify it passes.
5. Verify the dev server (already running at http://localhost:3300 per repo convention) still serves `/app` without browser-console `color2ShaderArr` errors. If dev server is not running, start it:
   ```sh
   cd apps/web && npx next dev -p 3300 > /tmp/skywave-web.log 2>&1 &
   ```
   Then hit `/app` with curl and `tail /tmp/skywave-web.log` to look for errors.
6. If the crash still fires, try an alternative: return a single static string from the accessor (`pathColor={TERMINATOR_COLOR as unknown as never}`). If that also fails, the issue is elsewhere — log the `terminator` array shape and inspect.
7. Commit with message:
   ```
   globe: day/night terminator — dashed grayline on the globe
   ```

## Inputs

- `apps/web/src/components/Globe.tsx`
- `apps/web/src/lib/sun.ts`
- Optional reference: `node_modules/three-globe/src/layers/paths.js`

## Outputs

- `apps/web/src/components/Globe.tsx` (modified; adds `pathsData` and related props)
- `apps/web/src/lib/sun.ts` (modified only if you need to change `terminatorPath` signature)
- One git commit on `main`

## Acceptance criteria

- `cd apps/web && npx next build` completes with exit code 0.
- Hitting `/app` in dev mode produces no `color2ShaderArr` or other `three-globe` runtime errors in browser console / `/tmp/skywave-web.log`.
- Visual inspection (dev server at http://localhost:3300/app) shows a dashed warm-yellow line tracing the day/night boundary on the globe.
