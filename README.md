# skywave

Real-time visualization of amateur radio HF propagation through the Earth's ionosphere.

A background worker polls the global WSPR network for reception reports, upserts into Supabase, and Supabase Realtime pushes new spots to a Next.js frontend that draws them as animated great-circle arcs on a dark globe.

> MPCS 51238 · Design, Build, Ship · Spring 2026 · Assignment 4

## Live URLs

- Web: _(Vercel URL after deploy)_
- Repo: _(GitHub URL after push)_

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full blueprint.

```
wspr.live  ──poll──▶  worker (Railway)  ──upsert──▶  Supabase  ──realtime──▶  web (Vercel)
```

## Layout

```
skywave/
├── apps/
│   ├── web/       Next.js + Tailwind frontend
│   └── worker/    Node.js polling worker
├── supabase/
│   └── migrations/
└── CLAUDE.md
```

## Dev

```sh
# once
npm install

# terminal 1
npm run dev:worker

# terminal 2
npm run dev:web
```

## Env

Copy `.env.example` in each app to `.env.local` and fill in.
