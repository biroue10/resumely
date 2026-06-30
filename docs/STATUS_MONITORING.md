# Status monitoring

The public status page (`/status/`) renders from **`/status.json`** via
`/status.js`. It does **not** claim a real-time uptime percentage and does not
inherit Cloudflare's SLA. To make the states genuinely live, connect an external
uptime monitor that probes the endpoints below and publishes `status.json`.

## What to monitor

| Component (status.json `id`) | What to probe | Type |
|---|---|---|
| `web` | `GET https://applycraft.io/` returns 200 and the app JS chunk loads | Browser/app |
| `ai` | `POST https://applycraft.io/api/ai` health/no-op returns 2xx/4xx (not 5xx) | Cloudflare Worker |
| `account` | `GET https://applycraft.io/api/account` returns 2xx/401 (not 5xx) | Cloudflare Worker |
| `payments` | pass-activation endpoint returns 2xx/4xx (not 5xx) | Cloudflare Worker |
| `cloudflare` / `anthropic` / `lemonsqueezy` | mirror the provider status pages | Third-party |

PDF/DOCX export and the resume/cover/ATS builders run **in the browser**, so they
are covered by the `web` check (the app JS loading) — there is no server to probe
for them.

## Option A — UptimeRobot / BetterStack → publish `status.json`

1. Create HTTP(S) monitors for each URL in the table (interval 1–5 min).
2. Add a small scheduled job (e.g. a Cloudflare Worker Cron, GitHub Action, or the
   monitor's webhook) that reads each monitor's state and writes `status.json`
   in the shape below, then commits/deploys it (or serves it from a KV/R2 bucket
   mapped to `/status.json`).
3. Set `overall` to the worst component state, and append entries to `incidents`
   when a monitor reports down/up transitions.

`status.json` shape (states: `operational | degraded | partial | major`):

```json
{
  "updatedAt": "2026-07-01T12:00:00Z",
  "overall": "operational",
  "components": [
    { "id": "web", "group": "ApplyCraft", "name": "Website & app", "desc": "...", "state": "operational" }
  ],
  "incidents": [
    { "date": "2026-07-01", "title": "AI helper slowdown", "state": "degraded", "detail": "Elevated latency for ~20 min." }
  ]
}
```

## Option B — hosted status page

Use BetterStack / Instatus / Statuspage, monitor the same URLs, and either embed
that page at `/status/` or link to it. Keep `status.json` as the machine-readable
source if you want the in-repo page to stay canonical.

## Notes
- `status.js` fetches with `cache: no-store` and degrades to "Status unavailable"
  if `status.json` is missing or stale — it never fabricates an "all good" state.
- Never include resume content, emails, tokens, or payment data in `status.json`.
