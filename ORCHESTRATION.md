# skywave — Swarm Orchestration

Four waves have run (Wave 1: code + configs, Wave 2: live URLs, Wave 3: audit + health footer + final docs, Wave 4 below: verification + visual audit + desirable polish).

## Wave 4 — submission-ready polish (parallel)

Three agents, disjoint outputs. Two produce reports (no commits), one ships polish commits.

```
Wave 4
├── live-verify     → VERIFICATION.md   (new, uncommitted)
├── visual-audit    → VISUAL_AUDIT.md   (new, uncommitted)
└── polish          → layout.tsx, globals.css, Globe.tsx, Dashboard.tsx,
                      new GlobeBoundary.tsx, new public/favicon.svg,
                      one git commit on main
```

Invocation:

```bash
cd "/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave"

claude -p "$(cat .agents/live-verify.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/live-verify.log 2>&1 &

claude -p "$(cat .agents/visual-audit.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/visual-audit.log 2>&1 &

claude -p "$(cat .agents/polish.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/polish.log 2>&1 &

wait
echo "Wave 4 complete."
cat VERIFICATION.md
cat VISUAL_AUDIT.md
git log --oneline | head -3
```

After Wave 4:
- Skim `VERIFICATION.md` — expect ✅ across HTTP / backend / RLS / build.
- Skim `VISUAL_AUDIT.md` — expect a short "recommended polish" list.
- `git push` to ship the polish commit.
- Record the 2–3 min video; talking points are in `ASSESSMENT.md`.

---



## Wave 3 — assignment-ready (parallel)

Three agents, disjoint files.

```
Wave 3
├── assessment           → ASSESSMENT.md  (new, uncommitted report)
├── final-docs           → README.md, CLAUDE.md
└── worker-health-footer → apps/web/src/components/WorkerHealth.tsx (new),
                           apps/web/src/components/Dashboard.tsx
```

Invocation:

```bash
cd "/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave"

claude -p "$(cat .agents/assessment.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/assessment.log 2>&1 &

claude -p "$(cat .agents/final-docs.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/final-docs.log 2>&1 &

claude -p "$(cat .agents/worker-health-footer.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/worker-health-footer.log 2>&1 &

wait
echo "Wave 3 complete."
git log --oneline | head -6
cat ASSESSMENT.md | head -40
```

After the wave completes:
- Read `ASSESSMENT.md` for a rubric-by-rubric status and any action items.
- If the health footer needs tuning or the docs missed something, make targeted edits.
- `git push`.
- Record the 2–3 min Slack video (the assessment report will surface 3–5 talking points).

---

# Earlier waves (for reference)

Four-agent Wave 1 ran in parallel, all writing to disjoint files. After a short human deploy step, a single Wave-2 agent injected the live URLs.

## Wave diagram

```
Wave 1 — four agents in parallel
├── terminator-fix   → apps/web/src/components/Globe.tsx (+ sun.ts if needed)
├── railway-config   → railway.toml (root), apps/worker/README.md
├── vercel-config    → apps/web/vercel.json, apps/web/README.md
└── docs-polish      → README.md, CLAUDE.md

          ↓ human step (not an agent):
             1. Railway: connect GitHub repo, env vars from apps/worker/README.md
             2. Vercel:  import GitHub repo, Root Directory = apps/web, env vars
             3. Supabase: add Vercel production + preview origins to
                Authentication → URL Configuration → Additional Redirect URLs
             4. Export VERCEL_URL and RAILWAY_URL in your shell.

Wave 2 — one agent
└── publish-urls     → README.md, CLAUDE.md   (fill <pending> with live URLs)
```

## Prerequisites

- `claude` CLI on `$PATH`.
- Run from the repo root: `/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave/`.
- The local dev servers are fine to leave running; agents won't restart them.

## Wave 1 invocation

All four agents in parallel. Logs stream to `.agents/logs/`.

```bash
cd "/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave"

claude -p "$(cat .agents/terminator-fix.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/terminator-fix.log 2>&1 &

claude -p "$(cat .agents/railway-config.md)"  \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/railway-config.log  2>&1 &

claude -p "$(cat .agents/vercel-config.md)"   \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/vercel-config.log   2>&1 &

claude -p "$(cat .agents/docs-polish.md)"     \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/docs-polish.log     2>&1 &

wait
echo "Wave 1 complete. Review commits: git log --oneline | head -10"
```

After Wave 1 finishes, inspect:

```bash
git log --oneline | head -10
npm run build --workspace apps/web   # should pass
npm run typecheck --workspace apps/worker
```

## Human step

1. Railway
   ```
   - Log in: https://railway.app
   - New Project → Deploy from GitHub → select enricoxpioppi98/skywave
   - Service Settings → Start Command is picked up from railway.toml
   - Variables tab → add:
       SUPABASE_URL=<from Supabase dashboard>
       SUPABASE_SERVICE_ROLE_KEY=<the secret one, not anon>
       POLL_INTERVAL_SEC=30
       RETENTION_HOURS=6
   - Deploy. Tail logs until `skywave.worker.boot` and periodic `skywave.poll.ok` appear.
   ```

2. Vercel
   ```
   - Log in: https://vercel.com
   - Add New Project → import enricoxpioppi98/skywave
   - Root Directory: apps/web
   - Environment Variables:
       NEXT_PUBLIC_SUPABASE_URL=<from Supabase>
       NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase, anon/publishable>
   - Deploy.
   ```

3. Supabase auth redirects
   ```
   - Supabase dashboard → Authentication → URL Configuration
   - Additional Redirect URLs: add
       https://<your-vercel-prod>.vercel.app/**
       https://<your-vercel-preview>.vercel.app/**
   - Save.
   ```

4. Export URLs
   ```sh
   export VERCEL_URL=https://your-vercel-prod.vercel.app
   export RAILWAY_URL=https://railway.app/project/<project-id>/service/<service-id>
   ```

## Wave 2 invocation

```bash
cd "/Users/enrico/Projects/Design, Build, Ship/Assignment 4/skywave"

claude -p "$(cat .agents/publish-urls.md)" \
  --allowedTools Read,Write,Edit,Grep,Glob,Bash \
  > .agents/logs/publish-urls.log 2>&1

git push
```

## Verification (end-to-end)

After all waves + deploys:

1. `git log --oneline | head -10` — Wave 1 and Wave 2 commits visible.
2. `cd apps/web && npx next build` — passes.
3. Open `$VERCEL_URL/app` in a fresh browser (clear cookies).
   - Landing loads, sign-in sends a magic link.
   - After click-through, `/app` shows the globe with real-time arcs, the dashed day/night terminator, ring pulses on new spots, and a populated space weather widget.
4. Open a second browser (different email). Sign in. Confirm isolated preferences (Row-Level Security is working).
5. Via Supabase MCP or dashboard:
   ```sql
   select count(*), max(observed_at) from spots
   where observed_at > now() - interval '5 minutes';
   ```
   Count should be > 0 and advancing minute-over-minute.

## Rollback

- If `terminator-fix` reintroduces a three-globe color crash: `git revert <hash>`. Arcs and rings continue to work — only the terminator is affected.
- If `railway-config` causes Railway build failures: check `railway.toml` syntax (or delete it; Railway will fall back to auto-detect).
- Any Wave 2 URL substitution mistake: `git revert <hash>` and re-run the agent.
