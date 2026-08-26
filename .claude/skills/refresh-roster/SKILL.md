---
name: refresh-roster
description: Refresh Pop Scout artist data from Spotify's public pages and write it back to Notion. Use when the user wants to update monthly listeners or top-track streams, re-check stale artists, verify whether someone still qualifies, or add a newly discovered artist to the roster. Replaces the blocked Spotify API cron.
---

# Refresh the Pop Scout roster

There is no Spotify API integration: the Web API exposes neither monthly
listeners nor per-track play counts, which are the two numbers this whole filter
rests on. Both live only on the public artist page. This skill reads those pages
directly and writes the results into Notion.

No API tokens needed. The Notion connector handles reads and writes; the browser
handles Spotify.

## The databases

| | ID |
|---|---|
| Artists data source | `collection://5d97bcd5-f57d-4ff7-bad7-30326c12c64b` |
| Sources data source | `collection://e4ab9d78-e845-4fe9-9767-d7efa6b9eced` |
| Artists page | https://app.notion.com/p/efb31334a08d4de4856ffff7f8cd160d |

## The two hard criteria

An artist **Qualifies** only if **both** hold:

- Monthly listeners **< 100,000**
- Top track streams **< 1,000,000**

Statuses: `Qualifies` · `Established` (too big, still pop) · `Off Genre` (wrong
genre regardless of size) · `Unverified` (flagged, not yet checked).

---

## Step 1 — pick the worklist

Ask what to refresh if it isn't obvious. Common cases:

**Stale rows** (default) — anything checked more than 30 days ago, or never:

```sql
SELECT "Name", "Spotify Artist ID", "Status", "Monthly Listeners",
       "Top Track Streams", "date:Checked At:start" AS checked
FROM "collection://5d97bcd5-f57d-4ff7-bad7-30326c12c64b"
WHERE "Spotify Artist ID" IS NOT NULL
  AND (checked IS NULL OR date(checked) < date('now', '-30 days'))
ORDER BY checked ASC NULLS FIRST
```

**Just the qualifiers** — the shortlist that actually matters, worth re-checking
most often, because these are the ones that outgrow the caps:

```sql
... WHERE "Status" = 'Qualifies'
```

Note `Meets Criteria` is a formula and **cannot** be queried in SQL. Compare the
two numeric columns directly instead.

Keep a batch to roughly 15–25 artists. Longer runs invite the bot-detection
described below.

## Step 2 — read each Spotify artist page

For each artist, navigate **directly** to the artist URL — never search:

```
https://open.spotify.com/artist/<Spotify Artist ID>
```

Then `get_page_text` with `max_chars` around 700. The top of the page carries
everything needed:

```
Dottie Andersson
69,593 monthly listeners
Follow
Popular

Only metaphorically
55,545

Wash my hair
E
60,778

Heavy Objects
2,690,027
```

Read from it:

- **Monthly listeners** — the `N monthly listeners` line.
- **Top track** — the entry under `Popular` with the **highest** play count. It
  is often *not* the first one listed; the list is ordered by Spotify's own
  ranking, not by plays. In the example above the top track is *Heavy Objects*
  at 2.69M, not *Only metaphorically* at 55K. Getting this wrong is the single
  easiest mistake to make here, and it silently corrupts the qualify/reject call.
- An `E` line between a title and its number is the explicit-content marker —
  skip it, the number still belongs to that track.
- A track showing **no** number has too few plays to display; treat as unknown,
  not zero.

For the artist photo, run in the same tab:

```js
document.querySelector('meta[property="og:image"]').content
```

This is reliable **only** on a direct artist-page load. It returns a stale or
wrong image during search flows.

### When Spotify starts refusing

After heavy automated traffic Spotify may degrade into a stripped "Mobile Web
Player" that ignores URL routing. Symptoms: the page text lacks a monthly
listener count, or every artist returns identical content.

Recover by slowing down — a few seconds between artists — or by opening a fresh
tab via `preview_start`. Do **not** work around it by guessing numbers or
carrying forward the previous value. If a page will not yield data, leave that
artist untouched and report it as skipped.

## Step 3 — recompute status before writing

For every artist, re-derive the status rather than preserving the old one:

- Both numbers under the caps → `Qualifies`
- Either at or over → `Established`
- Already `Off Genre` → **leave it**. Genre is a human judgement; numbers never
  move an artist in or out of it.

**Call out every status change explicitly in your report.** An artist crossing
out of `Qualifies` is the most valuable thing this job produces — it is the
whole reason the roster stays trustworthy. This is exactly how Dottie Andersson
was caught sitting in `Qualifies` with a 2.69M-stream top track.

## Step 4 — write to Notion

One `notion-update-page` per artist, `command: "update_properties"`:

```json
{
  "Monthly Listeners": 69593,
  "Top Track": "Heavy Objects",
  "Top Track Streams": 2690027,
  "Status": "Established",
  "Image URL": "https://i.scdn.co/image/...",
  "date:Checked At:start": "<today, YYYY-MM-DD>"
}
```

Property-name traps, both of which fail silently rather than erroring:

- Dates use the split form `date:Checked At:start`, never `Checked At`.
- On the **Sources** database the URL property is `userDefined:URL`, not `URL`.
  (Notion reserves bare `url` and `id`.)

`Checked At` is the only freshness signal in the system — there is no automated
refresh behind it. The Spotify Web API integration was removed because the API
exposes neither monthly listeners nor per-track play counts, so this workflow is
the sole path by which those numbers ever change.

## Step 5 — report

State plainly:

- How many artists were updated, and how many skipped with the reason
- **Every status change**, with the numbers that caused it
- Any artist whose numbers moved sharply — a listener count doubling is a
  scouting signal in itself, not just a data update
- Anything that looked wrong rather than merely changed

The site picks the changes up within the hour on its own. To publish
immediately, hit `/api/revalidate?secret=<CRON_SECRET>` (the secret is in
`.env.local`).

---

## Adding a new artist

Same page-read as above, plus: link the `Source` relation to the row in the
Sources database that surfaced the artist, and write a `Signal` note saying why
they are interesting *and* any red flag — existing management, a booking agent,
a label. An artist who clears both numeric caps but already has representation
is not really signable, and the numbers alone will not tell you that.

If the source is new, create it in the Sources database first (`Status` =
`Active` once it has produced an artist) so the relation and the site's live
source count both stay correct.
