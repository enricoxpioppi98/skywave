# skywave worker

Long-running Node.js process that polls [wspr.live](https://wspr.live) every ~30s for new HF radio reception reports and upserts them into the Supabase `spots` table. Also runs a 5-minute retention sweep that deletes spots older than `RETENTION_HOURS`.

## Env vars

| Name | Required | Default | Source |
|---|---|---|---|
| `SUPABASE_URL` | yes | — | Supabase project settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — | Supabase project settings → API → `service_role` key (secret) |
| `POLL_INTERVAL_SEC` | no | `30` | How often to query wspr.live |
| `RETENTION_HOURS` | no | `6` | Spots older than this are deleted on each retention sweep |
| `BATCH_LIMIT` | no | `2000` | Max rows fetched per poll |

## Local dev

Copy `.env.example` to `.env.local`, fill in Supabase creds, then from the repo root:

```sh
npm install
npm run dev --workspace apps/worker
```

Look for `skywave.worker.boot` in the output.

## Railway deploy

The repo root contains `railway.toml`, which Railway picks up automatically:

1. Create a Railway project from this GitHub repo.
2. Set every env var from the table above in the Railway service dashboard.
3. Deploy. Railway uses Nixpacks to install workspace deps from the repo root and runs `npm run start --workspace apps/worker`.

`restartPolicyType = "always"` means the worker auto-restarts on crash; the loop's exponential backoff handles transient wspr.live / Supabase errors without restarting.
