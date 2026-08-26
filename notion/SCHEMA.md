# Pop Scout — Notion schema

Two related databases. `Artists` is the working roster; `Sources` is the scouting
pipeline that feeds it. The relation between them is what makes the "Sources" stat
self-computing instead of a hardcoded number.

## These are already live

Both databases exist in **Mimi Ludwig's Space**, under the
[Pop Scout](https://app.notion.com/p/3c798763537a81ef8474ca5532f15a72) page, populated
with all 70 artists and 39 sources:

| Database | Page | Database ID (for `.env.local`) |
|---|---|---|
| [Pop Scout — Artists](https://app.notion.com/p/efb31334a08d4de4856ffff7f8cd160d) | 70 rows | `efb31334-a08d-4de4-856f-fff7f8cd160d` |
| [Pop Scout — Sources](https://app.notion.com/p/3ecb4f5d0ba74b7fa5bb26146fd3cd79) | 39 rows | `3ecb4f5d-0ba7-4b7f-a5bb-26146fd3cd79` |

`setup_notion.py` in this directory rebuilds them from the CSVs if you ever need a
fresh copy in another workspace. You don't need to run it for the existing ones.

---

## Database 1 — `Pop Scout — Artists`

| Property | Notion type | Notes |
|---|---|---|
| **Name** | Title | Artist name. |
| **Genre** | Multi-select | Split on `/` so "Indie Pop / R&B" becomes two tags — makes genre filtering actually work. |
| **Status** | Select | `Qualifies` · `Established` · `Off Genre` · `Unverified` |
| **Monthly Listeners** | Number (plain) | Spotify public artist page. |
| **Top Track** | Text | Most-played track name. |
| **Top Track Streams** | Number (plain) | Play count on that track. |
| **Meets Criteria** | Formula | Auto-verdict — see formula below. Catches drift when numbers refresh. |
| **Signal** | Text | The scouting note: why this artist is interesting, and any red flags. |
| **Source** | Relation → `Sources` | Where the artist came from. Drives the Sources rollup. |
| **Source URL** | URL | Direct link to the specific article/post. |
| **Spotify URL** | URL | |
| **Spotify Artist ID** | Text | Bare ID. Required for any automated refresh. |
| **Image URL** | URL | Spotify `og:image`. |
| **Followers** | Number (plain) | Spotify follower count. Auto-refreshed by the cron job. |
| **Popularity** | Number (plain) | Spotify's 0–100 score. Auto-refreshed. Not the same as listeners — see note below. |
| **Checked At** | Date | When a human last verified the numbers. |
| **Last Synced** | Date | When automation last refreshed them. Diverges from Checked At once a cron job exists. |
| **Shortlisted** | Checkbox | |
| **Priority** | Select | `High` · `Medium` · `Low` |
| **Rep Status** | Select | `Unrepresented` · `Has Booking` · `Has Label` · `Has Mgmt` · `Unknown` — the field that decides whether an artist is actually approachable. |
| **Label** | Text | Imprint if any. |
| **Territory** | Select | `US` · `UK` · `EU` · `AU` · `Other` |
| **Socials** | Text | TikTok / IG handles. |
| **Notes** | Text | Free-form. |

### `Meets Criteria` formula

```
if(
  empty(prop("Monthly Listeners")) or empty(prop("Top Track Streams")),
  "Incomplete",
  if(
    prop("Monthly Listeners") < 100000 and prop("Top Track Streams") < 1000000,
    "Qualifies",
    "Over cap"
  )
)
```

This is worth having: it's exactly the check that caught Dottie Andersson sitting in
`Qualifies` with a 2.69M-stream top track. Once numbers refresh automatically, this
flags drift the moment it happens instead of on the next manual audit.

### Recommended views

- **Board by Status** — the default working view.
- **Qualifies** — filter `Status = Qualifies`, sort Monthly Listeners ascending.
- **Needs review** — filter `Meets Criteria != "✅ Qualifies"` AND `Status = Qualifies`. Should always be empty; if it isn't, something drifted.
- **Stale** — filter `Checked At` before 30 days ago. The re-verification queue.
- **Shortlist** — filter `Shortlisted = checked`, grouped by Priority.

---

## Database 2 — `Pop Scout — Sources`

| Property | Notion type | Notes |
|---|---|---|
| **Name** | Title | |
| **URL** | URL | |
| **Type** | Select | `Newsletter` · `Instagram` · `Press` · `Community` · `Radio` · `Discovery Tool` · `Trade` |
| **Status** | Select | `Active` (has produced artists) · `Registered` (confirmed real, not yet mined) · `Dead End` |
| **Cadence** | Select | `Weekly` · `Monthly` · `Annual` · `Continuous` — weekly sources are the ones worth a standing habit. |
| **Artists** | Relation → `Artists` | Reverse side of the Artists relation. Already populated. |
| **Artists Found** | Rollup | `Artists` → `Count`. Already created. |
| **Last Mined** | Date | |
| **Notes** | Text | Including why a Dead End was ruled out — JV Agency, for example. |

**Still worth adding by hand:** a `Qualifiers Found` rollup — `Artists` → `Meets
Criteria` → Count, filtered to `Qualifies`. Filtered rollups are a UI-only feature,
and it's the single most useful number here: it ranks sources by how many genuinely
signable artists they produced, not just how many names they threw out.

---

### What can and can't refresh automatically

Worth being clear about, because it shapes the whole app: **Spotify's official Web API
does not expose monthly listeners or per-track play counts.** It gives followers, a
0–100 popularity score, genres, and images. Monthly listeners live only on the public
artist page and in Spotify for Artists.

So the split is:

| Field | How it updates |
|---|---|
| Followers, Popularity, Image URL | Cron job, hourly, via the official API |
| Monthly Listeners, Top Track Streams | Human-verified, stamped with `Checked At` |

Popularity is a reasonable momentum signal — it moves when an artist starts breaking —
but it is *not* a listener count and the dashboard shouldn't imply it is. Getting real
monthly-listener data on a schedule means a paid vendor (Songstats, Chartmetric), which
is a later decision, not a blocker.

---

## One thing this changes

Right now the dashboard's Sources stat is a hardcoded baseline (`26`) plus the length
of the registered list. Once Sources is a real database, the number becomes a live
count of rows — currently **39** (14 Active + 25 Registered), and it goes up on its own
every time you add a source.

The `Qualifiers Found` rollup is the more interesting number, though: it tells you
which sources are actually worth your time. SongsBrew's RADAR series produced 4
qualifiers in one pass; most annual "artists to watch" lists produced zero. That
ranking is a genuinely good thing to be able to show in an interview.

---

## Rebuilding elsewhere

The CSVs here (`artists.csv`, `sources.csv`) are the portable copy of the data. Notion's
own CSV import types every column as Text, so prefer `setup_notion.py` — it creates both
databases with correct types and the relation already wired, then imports every row. It
needs its own integration token; see the docstring at the top of that file.
