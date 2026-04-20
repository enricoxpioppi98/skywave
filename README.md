# skywave

**Watch the ionosphere reshape itself, live.** A real-time 3-D globe of amateur-radio HF propagation, built on the public WSPR reception-report stream.

> MPCS 51238 · Design, Build, Ship · Spring 2026 · Assignment 4

## Live URLs

- Web (Vercel): https://skywave-web-one.vercel.app
- Worker (Railway): https://railway.com/project/33a51341-1a56-4f88-a134-d2d576835b40

## Architecture

```
wspr.live  ──poll 30s──▶  worker (Railway)  ──upsert──▶  Supabase  ──realtime──▶  web (Vercel)
```

A Node.js worker polls [wspr.live](https://wspr.live) for new reception reports, upserts them into Supabase, and every connected browser sees the spot animate onto the globe within seconds of reception. See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, data schema, and deployment guide.

## Features

- **Live globe** with band-colored great-circle arcs from tx → rx, updating in real time via Supabase Realtime.
- **Realtime ring pulses** bloom at the receiver coordinates the moment each new spot arrives.
- **Subsolar-point marker** tracks where the sun sits overhead; a "fly to sun" control jumps the camera there.
- **Listening post** — pick any Maidenhead grid square as your home; stats and the spot feed orient around it.
- **Peer lock** — click any arc or station point to "listen in" from that receiver (or track transmissions from that transmitter). The feed and arcs filter to that station until you clear.
- **Space weather panel** — NOAA SWPC solar flux (F10.7) + planetary Kp index, translated into a plain-English HF-propagation rating (excellent / good / fair / poor / stormy).
- **Band filter** pills (160m → 2m) with select-all / none; the globe caps visible arcs to keep busy bands legible.
- **Globe controls** — auto-rotate toggle, recenter on your listening post, fly to sun.

## Quickstart

```sh
npm install

# terminal 1 — starts the wspr.live poller
npm run dev:worker

# terminal 2 — starts Next.js at localhost:3000
npm run dev:web
```

Both apps need Supabase credentials. Copy each `.env.example` to `.env.local` and fill in:

- [`apps/web/.env.example`](./apps/web/.env.example) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [`apps/worker/.env.example`](./apps/worker/.env.example) — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `POLL_INTERVAL_SEC` / `RETENTION_HOURS`

Apply the SQL migrations in [`supabase/migrations/`](./supabase/migrations) to a fresh Supabase project before first run.

## Tech stack

Next.js 16 (App Router, React 19) · Tailwind 4 · `react-globe.gl` (Three.js) · Supabase (Postgres + Realtime + Auth + RLS) · Node.js 22 worker on Railway · Vercel for the web.

## Layout

```
skywave/
├── apps/
│   ├── web/                 Next.js frontend
│   └── worker/              Railway polling worker
├── supabase/migrations/     SQL schema + RLS + realtime
├── railway.toml             Worker build/start config
├── CLAUDE.md                Full architecture + deployment
└── README.md                you are here
```
