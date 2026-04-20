# skywave — web

The web surface for skywave: a Next.js 16 + React 19 + Tailwind 4 app that renders a live globe of HF radio reception reports streamed from Supabase Realtime.

## Local dev

```bash
cd apps/web
cp .env.example .env.local   # fill in values
npm install                  # from repo root if you haven't already
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Public; RLS-gated |

See `apps/web/.env.example`.

## Deploy on Vercel

1. Import the GitHub repo into Vercel.
2. In the Vercel dashboard, set **Root Directory** to `apps/web`.
3. Add the env vars from the table above (Production + Preview).
4. Deploy. The `vercel.json` in this directory pins the framework, install command, and workspace-aware build command. Supabase Realtime works over WSS automatically — no extra config needed.

### Supabase auth redirects

Magic-link and OAuth callbacks must include the Vercel origins. In the Supabase dashboard:

**Authentication → URL Configuration → Additional Redirect URLs**, add:

- `https://<your-prod-domain>/**`
- `https://<your-project>-*.vercel.app/**` (covers preview deployments)
