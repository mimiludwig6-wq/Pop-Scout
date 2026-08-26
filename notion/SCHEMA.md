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
| **Spotify Artist ID** | Text | Bare ID. The refresh workflow navigates straight to `open.spotify.com/artist/<id>` with it. |
| **Image URL** | URL | Spotify `og:image`. |
| **Checked At** | Date | When the numbers were last verified against Spotify's public artist page. |
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

Worth having: this is the check that caught Dottie Andersson sitting in `Qualifies`
with a 2.69M-stream top track, and later Eileen Alister, AmiiFy and Lauren Auder —
all three recorded against a well-known single rather than their most-played track.
The formula re-evaluates the moment a number is edited, so drift surfaces on the
spot rather than at the next audit.

### Recommended views

- **Board by Status** — the default working view.
- **Qualifies** — filter `Status = Qualifies`, sort Monthly Listeners ascending.
- **Needs review** — filter `Meets Criteria != "Qualifies"` AND `Status = Qualifies`. Should always be empty; if it isn't, something drifted.
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

### Why there is no automated refresh

Spotify's Web API exposes neither monthly listeners nor per-track play counts —
the two numbers the whole filter rests on. It offers followers, a 0–100
popularity score, genres and images, none of which answer whether an artist is
small enough to sign, and it gates access on the app owner holding Premium.

An API integration was built and then removed rather than left dormant returning
data nobody needed. `Checked At` is therefore the only freshness signal, and the
`refresh-roster` skill is how it gets updated.

---

## Why the relation matters

The dashboard's Sources stat is a live count of rows in this database — currently
**39** (14 Active + 25 Registered) — so it climbs on its own as sources are added,
rather than being a number someone has to remember to update.

The `Qualifiers Found` rollup is the more interesting one, though: it tells you
which sources are actually worth your time. SongsBrew's RADAR series produced 4
qualifiers in one pass; most annual "artists to watch" lists produced zero. That
ranking is a genuinely good thing to be able to show in an interview.

---

## Rebuilding elsewhere

The CSVs here (`artists.csv`, `sources.csv`) are the portable copy of the data. Notion's
own CSV import types every column as Text, so prefer `setup_notion.py` — it creates both
databases with correct types and the relation already wired, then imports every row. It
needs its own integration token; see the docstring at the top of that file.
