# Pop Scout — web app

Next.js App Router, deployed on Vercel, reading its roster live from Notion.

The point of this version: **editing a row in Notion changes the site.** No code
edit, no redeploy, no `data.js`.

---

## How the data flows

```
   refresh-roster skill              you edit
   (Spotify public pages)               │
           │                            │
           ▼                            ▼
    ┌───────────────────────────────────────┐
    │              Notion                   │
    │        Artists  ◄──►  Sources         │
    └────────────────┬──────────────────────┘
                     │ Notion API (cached 1h, tagged)
                     ▼
    ┌───────────────────────────────────────┐
    │            Next.js on Vercel          │
    │  Server Component renders the roster  │
    │  Client Component handles filtering   │
    └───────────────────────────────────────┘
```

### There is no Spotify API integration, on purpose

Spotify's Web API **does not expose monthly listeners or per-track play counts** —
the two numbers this entire filter depends on. It offers followers, a 0–100
popularity score, genres, and images. None of those answer "is this artist small
enough to sign." Spotify also gates Web API access on the app owner holding a
Premium subscription.

So the API was dropped rather than kept around returning data nobody needed.

| Field | Updates how | Cadence |
|---|---|---|
| Monthly Listeners, Top Track Streams | Verified by hand against the public artist page | Stamped with `Checked At` |
| Everything else | Whenever you edit Notion | Live within the hour |

Re-checking runs through the [`refresh-roster`](.claude/skills/refresh-roster/SKILL.md)
skill. Scaling past manual re-checks would mean a paid vendor (Songstats,
Chartmetric).

---

## Setup

### 1. Node

Requires Node 18.18+. If `node --version` fails, install the macOS `.pkg` from
[nodejs.org/en/download](https://nodejs.org/en/download).

### 2. Notion

**The databases already exist** in Mimi Ludwig's Space, under the
[Pop Scout](https://app.notion.com/p/3c798763537a81ef8474ca5532f15a72) page, fully
populated. You just need their IDs and a token:

```
NOTION_ARTISTS_DB=efb31334-a08d-4de4-856f-fff7f8cd160d
NOTION_SOURCES_DB=3ecb4f5d-0ba7-4b7f-a5bb-26146fd3cd79
```

For `NOTION_TOKEN`, create an integration at
[notion.so/my-integrations](https://www.notion.so/my-integrations), then open each
database → `•••` → **Connections** → add it. Without that step the app gets a 404 and
the page will tell you so.

To rebuild the databases from scratch somewhere else, see
[`notion/SCHEMA.md`](notion/SCHEMA.md).

### 3. Local run

```bash
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
2. Add the four environment variables from `.env.example` under
   Settings → Environment Variables.
3. Deploy.

**Leave Root Directory empty.** The app lives at the repo root precisely so that
setting never has to be touched — an earlier layout kept it in `web/`, and a
missed Root Directory silently shipped the old static prototype instead. If the
project still has `web` set from that layout, clear it or the build will fail
with "directory not found".

`vercel.json` pins the framework to `nextjs` so detection can't drift — an
earlier deploy built the app correctly and then failed looking for a `public/`
directory because the project's Framework Preset was still set to "Other".

### Endpoint

| Route | What it does |
|---|---|
| `/api/revalidate?secret=…` | Drops the Notion cache immediately — use after a batch of edits instead of waiting out the hour. Accepts the secret as `?secret=` or `Authorization: Bearer …`, and 401s without it. |

---

## Notes

- The **Sources** stat is now a live row count from the Sources database, so it
  climbs on its own as you register sources. The old hardcoded baseline is gone.
- Notion's API allows roughly 3 requests/second, so any bulk write-back (the
  refresh workflow, the rebuild script) needs to pace itself.
- Filtering, sorting, and the shortlist all run client-side on an already-loaded
  roster, so they stay instant — no request per keystroke.
