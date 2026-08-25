# Pop Scout — Notion schema

Two related databases. `Artists` is the working roster; `Sources` is the scouting
pipeline that feeds it. The relation between them is what makes the "Sources" stat
self-computing instead of a hardcoded number.

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
  "⚠️ Incomplete",
  if(
    prop("Monthly Listeners") < 100000 and prop("Top Track Streams") < 1000000,
    "✅ Qualifies",
    "📈 Over cap"
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
| **Artists** | Relation → `Artists` | Reverse side of the Artists relation. |
| **Artists Found** | Rollup | `Artists` → `Count`. |
| **Qualifiers Found** | Rollup | `Artists` → `Meets Criteria` → Count matching `✅ Qualifies`. The real hit-rate signal. |
| **Last Mined** | Date | |
| **Notes** | Text | Including why a Dead End was ruled out — JV Agency, for example. |

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

## Import

`artists.csv` (70 rows) and `sources.csv` (39 rows) import straight into Notion, but
CSV import types every column as Text. Either fix the types in the UI afterward using
the tables above, or run `setup_notion.py`, which creates both databases with the
correct types and relations already in place.
