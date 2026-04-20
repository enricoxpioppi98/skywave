# skywave — Architecture

A real-time visualization of amateur radio HF propagation through the Earth's ionosphere. A background worker polls the global WSPR network for reception reports, a Next.js frontend renders them as animated great-circle arcs on a dark globe, and Supabase Realtime pushes new spots to every connected browser as they arrive.

**One-line pitch:** *Watch the ionosphere reshape itself, live.*

---

## 1. The data

**Source:** [wspr.live](https://wspr.live) — a public ClickHouse database mirroring the global WSPRnet reception report stream.

**What a "spot" is:** every ~2 minutes, amateur radio operators worldwide transmit tiny (<1W) encoded beacons on specific HF frequencies. Other hams' receivers decode these beacons via ionospheric skip and upload reports. One "spot" = one successful reception = one transmitter-to-receiver link through the sky.

**Volume:** ~500k–1M spots/day globally. During solar peaks or geomagnetic storms, propagation changes within minutes — you can literally see bands open and close.

**Access:**
- Endpoint: `https://db1.wspr.live/`
- Method: HTTP GET with SQL query as `query` parameter
- Rate limit: **20 requests/min** (well above our polling cadence)
- Format: ClickHouse CSV or JSON

**Fields per spot we care about:**

| Field | Type | Meaning |
|---|---|---|
| `id` | bigint | Global unique spot ID |
| `time` | timestamp | Reception time (UTC) |
| `band` | int | Meter band (20, 40, 80, etc.) |
| `frequency` | double | MHz |
| `tx_sign` | text | Transmitter callsign |
| `tx_lat`, `tx_lon` | double | Transmitter coordinates |
| `tx_loc` | text | Transmitter Maidenhead grid |
| `rx_sign` | text | Receiver callsign |
| `rx_lat`, `rx_lon` | double | Receiver coordinates |
| `rx_loc` | text | Receiver Maidenhead grid |
| `distance` | int | Km between tx and rx |
| `azimuth` | int | Bearing from tx to rx |
| `snr` | int | Signal-to-noise ratio (dB) |
| `power` | int | Transmit power (dBm) |
| `drift` | int | Frequency drift |

---

## 2. System architecture

```
┌─────────────────┐  poll /30s   ┌─────────────────┐  upsert    ┌──────────────────┐  realtime   ┌──────────────────┐
│  wspr.live      │ ───────────▶ │  skywave worker │ ─────────▶ │  Supabase (spots)│ ──────────▶ │  Next.js (web)   │
│  (ClickHouse)   │              │  Railway / Node │            │  Postgres + RLS  │             │  Vercel / React  │
└─────────────────┘              └─────────────────┘            └──────────────────┘             └──────────────────┘
                                                                        ▲                                  │
                                                                        │ read prefs                       │
                                                                        └──────────────────────────────────┘
                                                                                     user writes prefs
```

**Three services:**
1. **Worker (Railway)** — Node.js + TypeScript. Polls wspr.live on a timer, upserts into Supabase using the service-role key. No HTTP server — just a long-running process.
2. **Supabase (managed)** — Postgres + Realtime + Auth + RLS. The coordination layer.
3. **Web (Vercel)** — Next.js 15 App Router + Tailwind + `@supabase/ssr`. Anonymous users hit the landing page; signed-in users get the live globe.

---

## 3. Database schema

### `spots` (worker writes, everyone reads recent)

```sql
create table spots (
  id              bigint primary key,            -- from wspr.live
  observed_at     timestamptz not null,
  band            smallint not null,
  frequency_mhz   double precision not null,
  tx_sign         text not null,
  tx_lat          double precision not null,
  tx_lon          double precision not null,
  tx_grid         text not null,
  rx_sign         text not null,
  rx_lat          double precision not null,
  rx_lon          double precision not null,
  rx_grid         text not null,
  distance_km     integer not null,
  azimuth         smallint,
  snr             smallint,
  power_dbm       smallint,
  drift           smallint,
  ingested_at     timestamptz not null default now()
);

create index spots_observed_at_desc on spots (observed_at desc);
create index spots_band_observed_at on spots (band, observed_at desc);
create index spots_rx_grid_prefix on spots (substring(rx_grid, 1, 4));
```

**Retention:** cron job deletes spots older than 6 hours (free-tier Supabase has 500MB; at ~200 B/row × 1M rows/day, 6h keeps us under 50 MB).

### `user_preferences` (user writes own row only)

```sql
create table user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  listening_post_grid  text not null default 'FN31',       -- 4-char Maidenhead
  favorite_bands       smallint[] not null default '{20,40}',
  callsign             text,                               -- optional, for hams
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
```

**Personalization model — "listening post":**
- Any user (ham or not) picks a Maidenhead grid square anywhere on Earth (their "listening post").
- They see signals reaching that square, filtered to their favorite bands.
- If they enter a real callsign, a "my signals" view shows spots where they were tx or rx.

### Row-Level Security

```sql
alter table spots enable row level security;
alter table user_preferences enable row level security;

-- Anyone authenticated can read spots; nobody can write via anon key
create policy spots_read on spots
  for select to authenticated using (true);

-- Users can only see/modify their own preferences
create policy prefs_self_read on user_preferences
  for select to authenticated using (auth.uid() = user_id);
create policy prefs_self_write on user_preferences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

The worker uses the **service-role key**, which bypasses RLS.

### Realtime

Enabled on `spots` only (user prefs don't need realtime). Frontend subscribes to `INSERT` events on `spots`, filters client-side by band.

---

## 4. The worker

**Language:** TypeScript, `tsx` for dev, `tsc` for production build.
**Runtime:** Node.js 22 on Railway.

**Loop (pseudocode):**

```
loop {
  since = last_ingested_at or (now - 2 min)
  sql = `SELECT ... FROM wspr.rx
         WHERE time > '${since}'
         ORDER BY time ASC
         LIMIT 2000
         FORMAT JSONEachRow`
  rows = fetch(wspr_live, sql)
  if rows.length > 0 {
    supabase.from('spots').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    last_ingested_at = max(rows.time)
  }
  sleep(30_000)
}
```

**Design notes:**
- 30s cadence = 2 req/min → well under wspr.live's 20 req/min limit
- `ON CONFLICT DO NOTHING` on `id` handles overlap/retries cleanly
- Start-up: query max `observed_at` from Supabase to resume without gaps
- Errors: log + exponential backoff (max 5 min); don't crash the process — Railway will restart but we lose state

**Retention cron:** a separate lightweight loop (same process) runs `delete from spots where observed_at < now() - interval '6 hours'` every 5 minutes.

---

## 5. The frontend

**Framework:** Next.js 15 (App Router) + React 19 + Tailwind 4.
**Auth:** Supabase Auth via `@supabase/ssr` — email magic link + OAuth (GitHub).
**Globe:** `react-globe.gl` (Three.js) with animated arc layer; or Deck.gl ArcLayer over Mapbox if we want 2D.

**Routes:**

```
/                    landing page + sign-in
/app                 main dashboard — globe + spot list + stats (auth required)
/app/settings        edit listening post, bands, callsign
```

**Layout of /app:**

- **Globe (center, full-bleed):** dark earth, animated arcs from tx → rx for spots matching user's band filter, last 30 min. Arc color = band (warm for low freq, cool for high). Listening post glows.
- **Left rail:** live-updating spot list — each new spot appears at the top with band pill, distance, SNR. Filtered to spots whose tx **or** rx is within ~500 km of user's listening post OR for users with a callsign, spots involving them.
- **Right rail:** stats — active spots last 10 min by band (bar chart), farthest distance in last hour, current solar-wind / Kp index teaser (stretch goal link to space-weather panel).
- **Top bar:** band multi-select, grid square display, settings gear.

**Data fetching:**
1. On mount, SSR fetches the last 30 min of spots matching user's bands (from Supabase).
2. Client subscribes to `INSERT` on `spots` via Realtime channel.
3. Client filters incoming spots by user prefs, pushes into a bounded list (cap 500 rows) and animates arc into the globe.
4. Aged-out arcs (>30 min) fade out of the globe.

---

## 6. Data flow (end to end)

1. WSPRnet receiver somewhere uploads a reception report.
2. wspr.live ingests it into ClickHouse (within seconds).
3. skywave worker's next 30s poll finds it.
4. Worker upserts into Supabase `spots`. Postgres logical replication fires.
5. Supabase Realtime broadcasts the INSERT to every subscribed browser via WebSocket.
6. Each browser filters by its user's bands and draws a new arc.

**End-to-end latency target:** <60s from reception to visible arc.

---

## 7. Environments & secrets

### Worker (Railway)

| Var | Source | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase project settings | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings | **Secret** |
| `POLL_INTERVAL_SEC` | Railway dashboard | Default 30 |

### Web (Vercel)

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public (RLS-gated) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox | If using Mapbox |

Local dev uses `.env.local` in each app. Never commit `.env.local`.

---

## 8. Repository layout

```
skywave/
├── apps/
│   ├── web/                   Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (app)/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   └── lib/
│   │   │       ├── supabase/  server + client + middleware
│   │   │       └── wspr/      types, band constants, grid math
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                Railway polling worker
│       ├── src/
│       │   ├── index.ts       main loop
│       │   ├── wspr.ts        wspr.live HTTP client
│       │   ├── supabase.ts    service-role client
│       │   └── retention.ts   old-spot cleanup
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   └── migrations/
│       ├── 001_init.sql       spots + user_preferences + RLS
│       └── 002_realtime.sql   enable realtime on spots
│
├── package.json               npm workspaces root
├── CLAUDE.md                  this file
├── README.md                  setup + live URLs
└── .gitignore
```

---

## 9. Deploy plan

1. **Supabase** — create project (via MCP), run migrations, enable Realtime on `spots`, grab URL + keys.
2. **GitHub** — push monorepo.
3. **Railway** — new project from GitHub, root = `apps/worker`, start = `npm start`, add env vars.
4. **Vercel** — new project from GitHub, root = `apps/web`, framework = Next.js, add env vars.
5. **Smoke test** — sign up from a second browser as a different user, verify prefs are isolated and arcs animate live.

---

## 10. Stretch goals

- Space weather panel: Kp index + solar wind overlay (explains propagation changes).
- Replay mode: scrub last 24 hours to watch bands open and close.
- Per-band globes (small multiples) to compare propagation across frequencies.
- Aggregate heatmap layer: distance-band reachability as a function of time of day.
- Audio — morse callsign ping when a spot arrives matching your alert filter.

---

## 11. Non-goals

- We're not a replacement for PSKReporter or the wsprnet.org stats pages.
- No ham radio license required to use the app. No packet transmission. Read-only consumer of public data.
- No historical archive beyond the 6-hour retention window (wspr.live itself is the archive).
