# Pop Scout — web app

Next.js App Router, deployed on Vercel, reading its roster live from Notion.

The point of this version: **editing a row in Notion changes the site.** No code
edit, no redeploy, no `data.js`.

---

## How the data flows

```
        you edit                    daily cron
           │                            │
           ▼                            ▼
    ┌─────────────┐            ┌─────────────────┐
    │   Notion    │◄───────────│  Spotify Web    │
    │  Artists /  │  followers │  API            │
    │  Sources    │  popularity│                 │
    └──────┬──────┘  image     └─────────────────┘
           │
           │ Notion API (cached 1h, tagged)
           ▼
    ┌─────────────┐
    │  Next.js    │  Server Component renders the roster
    │  on Vercel  │  Client Component handles filtering
    └─────────────┘
```

### What refreshes on its own, and what doesn't

Spotify's Web API **does not expose monthly listeners or per-track play counts.**
It gives followers, a 0–100 popularity score, genres, and images. Monthly
listeners live only on the public artist page and in Spotify for Artists.

| Field | Updates how | Cadence |
|---|---|---|
| Followers, Popularity, Image | Spotify Web API via cron | Daily, 07:00 UTC |
| Monthly Listeners, Top Track Streams | Verified by hand in Notion | Stamped with `Checked At` |
| Everything else | Whenever you edit Notion | Live within the hour |

The dashboard says this out loud rather than implying popularity is a listener
count. Getting real monthly-listener data on a schedule means a paid vendor
(Songstats, Chartmetric) — a later decision, not a blocker.

---

## Setup

### 1. Node

Requires Node 18.18+. If `node --version` fails, install the macOS `.pkg` from
[nodejs.org/en/download](https://nodejs.org/en/download).

### 2. Notion

From the repo root:

```bash
export NOTION_TOKEN=ntn_xxxxx
export NOTION_PARENT_PAGE_ID=xxxxx
python3 notion/setup_notion.py
```

That creates both databases with correct property types and imports all 70
artists and 39 sources. It prints the two database IDs at the end.

Then add the two rollups on the Sources database by hand — the Notion API can't
create rollups. Settings are in [`../notion/SCHEMA.md`](../notion/SCHEMA.md).

### 3. Spotify

[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Create
app. Client Credentials flow only, so no redirect URI matters. Copy the Client ID
and Client Secret.

### 4. Local run

```bash
cd web
cp .env.example .env.local
```

Fill in `.env.local`, then:

```bash
npm install && npm run dev
```

http://localhost:3000

If the roster doesn't load, the page says why. The usual cause is forgetting to
share each database with the integration: in Notion, open the database → `•••` →
**Connections** → add your integration.

---

## Deploying to Vercel

1. [vercel.com/new](https://vercel.com/new) → import `mimiludwig6-wq/Pop-Scout`.
2. **Set Root Directory to `web`.** The repo root still holds the original static
   version; without this Vercel builds the wrong thing.
3. Add all six environment variables from `.env.example` under
   Settings → Environment Variables.
4. Deploy.

The cron in `vercel.json` registers automatically. Vercel passes `CRON_SECRET` as
a bearer token, so the endpoint is protected without extra work.

### Endpoints

| Route | What it does |
|---|---|
| `/api/cron/refresh?secret=…` | Pulls Spotify metrics into Notion, then busts the cache. Runs daily on its own. |
| `/api/revalidate?secret=…` | Drops the Notion cache immediately — use after a batch of edits instead of waiting the hour. |

Both accept the secret as `?secret=` or as `Authorization: Bearer …`.

---

## Notes

- The **Sources** stat is now a live row count from the Sources database, so it
  climbs on its own as you register sources. The old hardcoded baseline is gone.
- The refresh job sleeps 340ms between writes to respect Notion's ~3 req/sec
  limit. At 70 artists that's about 25 seconds, inside Vercel's 60s function
  ceiling. Past roughly 150 artists, batch it across multiple runs.
- Filtering, sorting, and the shortlist all run client-side on an already-loaded
  roster, so they stay instant — no request per keystroke.
