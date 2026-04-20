# Agent: polish

## Goal

Ship a set of small, high-value polish improvements to the frontend — metadata for link previews, an error boundary around the globe, accessibility labels on icon-only controls, and focus-visible styles. Single commit.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Frontend under `apps/web/src/`. Tailwind 4 + custom CSS variables in `apps/web/src/app/globals.css`.
- Root layout at `apps/web/src/app/layout.tsx` has `title` and `description` — missing Open Graph / Twitter card / favicon wiring.
- `Globe.tsx` is the single biggest failure surface (three.js). If it throws at mount, the whole `/app` crashes because there's no error boundary around it.
- Several icon-only buttons (pill toggles, auto-rotate, recenter, fly-to-sun, sign-out button in header) lack `aria-label`.

## Instructions

Do all of the below in one commit. Keep diffs minimal and reversible.

1. **Metadata — `apps/web/src/app/layout.tsx`.** Expand `export const metadata` to include:
   - `title` and `description` (keep existing).
   - `metadataBase: new URL("https://skywave-web-one.vercel.app")`.
   - `openGraph`: `{ title, description, type: "website", url, siteName: "skywave" }`.
   - `twitter`: `{ card: "summary_large_image", title, description }`.
   - `icons`: `{ icon: "/favicon.svg" }` (see step 2).

2. **SVG favicon — `apps/web/public/favicon.svg`** (new). A small, on-brand 24×24 that reads at favicon sizes:
   - Dark circle background (`#05070e`), a warm-cyan `#7ee3ff` great-circle arc curving from upper-left to lower-right (stroke 2), plus a small amber dot (`#ffbb5c`) at the arc midpoint. Inline it; no external refs. Keep under ~400 bytes.
   - Remove any lingering `favicon.ico` reference in layout if the Next template hard-codes one. Next will serve `public/favicon.svg` via the `icons.icon` metadata.

3. **Error boundary — `apps/web/src/components/GlobeBoundary.tsx`** (new client component):
   - Class component extending `React.Component` (Next.js 16 still supports this pattern for error boundaries; functional boundaries require hooks that React doesn't expose).
   - On error, render a small centered panel: mono text "globe unavailable — try refreshing", muted, with a retry button that calls `window.location.reload()`. Match the dark theme.
   - Log the error with `console.error` so devtools still shows it.
   - Wrap `<Globe …/>` usage in `Dashboard.tsx`:
     ```tsx
     <GlobeBoundary>
       <Globe … />
     </GlobeBoundary>
     ```
     Import alongside the existing dynamic import.

4. **Accessibility labels.** Search for buttons whose content is purely an icon / symbol / band abbreviation and add `aria-label`:
   - `Dashboard.tsx`: `selectAll` / `selectNone` buttons already read "all"/"none" (text content counts — skip). Band pills have their band name as text — skip. The `clear ✕` button in `PeerBanner` has text too — skip.
   - `Globe.tsx` control dock: `◐ rotating / paused` button → `aria-label="toggle auto-rotate"`; `⊕ recenter` → `aria-label="recenter on listening post"`; `☀ sun` → `aria-label="fly to subsolar point"`.
   - `app/layout.tsx` (app group) signout `<button>` — already says "sign out" as text. Skip.

5. **Focus-visible styles — `apps/web/src/app/globals.css`.** Append a global `:focus-visible` rule so keyboard users can see where focus is:
   ```css
   :focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
     border-radius: 4px;
   }
   ```
   Test with Tab key after deploy (manual).

6. **Verify build passes.** `cd apps/web && npx next build` — exit 0.

7. **Commit.**
   ```
   polish: og metadata, svg favicon, globe error boundary, focus-visible, aria labels
   ```

## Inputs

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/Globe.tsx`
- `apps/web/src/components/Dashboard.tsx`
- `apps/web/public/` (to add favicon.svg)

## Outputs

- `apps/web/src/app/layout.tsx` (modified)
- `apps/web/src/app/globals.css` (appended)
- `apps/web/src/components/Globe.tsx` (aria-label additions only)
- `apps/web/src/components/Dashboard.tsx` (wrap Globe in boundary)
- `apps/web/src/components/GlobeBoundary.tsx` (new)
- `apps/web/public/favicon.svg` (new)
- One git commit on `main`

## Acceptance criteria

- `next build` passes.
- Root-layout metadata exports include `openGraph`, `twitter`, `icons`, `metadataBase`.
- `/favicon.svg` is served and referenced in the document head (check built HTML).
- `<GlobeBoundary>` wraps `<Globe>` in `Dashboard.tsx`.
- Global `:focus-visible` rule present in `globals.css`.
- Each Globe-control-dock button has an `aria-label`.
