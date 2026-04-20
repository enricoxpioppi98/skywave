# Agent: visual-audit

## Goal

Static audit of the frontend code for visual / UX / accessibility issues, producing `VISUAL_AUDIT.md` at the repo root. Read-only apart from that report.

## Context

- Repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave`
- Frontend: Next.js 16 + Tailwind 4 + custom CSS variables in `apps/web/src/app/globals.css` (`--background`, `--foreground`, `--panel`, `--accent`, etc.).
- Dark, sci-fi aesthetic. Typography: Geist Sans + Geist Mono.
- Components under `apps/web/src/components/`: `Dashboard`, `Globe`, `SpotFeed`, `StatsPanel`, `SettingsForm`, `SpaceWeather`, `WorkerHealth`.
- Pages: `/` (landing), `/login`, `/app`, `/app/settings`.
- Prior layout bug: flex containers missing `min-h-0` caused the spot feed to push the globe. Confirm that's stable.

## Instructions

1. **Layout audit.** Read `Dashboard.tsx` and the two `layout.tsx` files. Verify:
   - No flex parents missing `min-h-0` on their flex children.
   - Spot feed scrolls internally on overflow.
   - Band pill + peer banner wrapper doesn't allow overlap on wrap.
   - `overflow-hidden` on `<main>` so nothing escapes.
   - On mobile stacking (`flex-col` below `md:`), the globe section has a floor height (`min-h-[50vh]`).

2. **Accessibility (static).**
   - Every icon-only button has an `aria-label` or `title` or accessible text.
   - Every `<form>` has an implicit/explicit submit behavior described.
   - `<img>` tags have `alt` (there are no plain `<img>`; Next/Image with `alt` is OK).
   - Focus-visible styles exist either from Tailwind defaults or a custom rule. If the globals.css has no `:focus-visible` or `focus:ring` utilities anywhere, flag it.
   - Any text below 12 px (`text-[10px]`) is non-critical (labels only) — verify nothing important is hiding at that size on the landing page.
   - Contrast: sample a few foreground/background pairings from `globals.css` variables (muted + panel especially). Report approximate WCAG AA verdict (don't need to be exact; note any pairing that looks < 3:1).

3. **Metadata / SEO polish.**
   - Check `apps/web/src/app/layout.tsx` for `title`, `description`, and Open Graph / Twitter card tags. Flag missing og:image, og:type, twitter:card — these matter because someone posting the link in Slack gets a preview.
   - Check `public/` — note if favicon is still the Next.js default or the app's own.

4. **Loading / empty / error states.**
   - `Dashboard.tsx`: what does the user see when `spots` is empty (first 2 sec after login)? Is there a skeleton or just whitespace?
   - `Globe.tsx`: if three.js fails to load or the NASA texture 404s, what's the fallback? Already has a CDN fallback for the image — note if there's an error boundary above (there isn't).
   - `SpaceWeather`, `WorkerHealth`: what does the render look like while fetching / before any spots? Fine if the render is graceful.

5. **Brand consistency.**
   - Every screen uses the same dark theme palette (confirm no stray Tailwind defaults like `bg-white` or `text-black` sneaking in from early scaffolding).
   - `mono` class (Geist Mono) is applied consistently for technical metrics (distances, SNR, timestamps).

6. **Mobile quick-check.** Read `Dashboard.tsx` md: breakpoints and the band-pill container. Sketch what the layout does below 768 px in a few sentences. Flag any obvious issues (e.g. band pills overflowing, feed + globe stacking too tight).

7. **`VISUAL_AUDIT.md`** at the repo root with sections:
   - **Summary** — one-line verdict.
   - **Layout** — bulleted findings + file:line pointers.
   - **Accessibility** — bulleted.
   - **Metadata / SEO** — bulleted.
   - **State handling** — bulleted.
   - **Brand consistency** — bulleted.
   - **Mobile** — short paragraph + verdict.
   - **Recommended polish** — ordered list, each item marked [trivial / small / medium] effort with a one-line description.

8. Do not commit. Print the path on stdout.

## Inputs

- `apps/web/src/app/**/*.{tsx,css}`
- `apps/web/src/components/**/*.tsx`
- `public/**/*`

## Outputs

- `VISUAL_AUDIT.md` (new, uncommitted)

## Acceptance criteria

- File exists at `./VISUAL_AUDIT.md` and is < 250 lines.
- Every finding cites a file (and line number when feasible).
- Findings are prioritized — the reader can fix top 3 items in < 30 min total.
- No false positives from outdated code assumptions — cross-check against current source before flagging.
