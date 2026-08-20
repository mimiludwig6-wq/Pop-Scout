# Pop Scout

A working watchlist for scouting emerging pop artists — built to find acts small enough to still be signable, not another "artists to watch" list full of names that already have a machine behind them.

## What it does

Every candidate is checked against two hard numbers pulled from Spotify's public artist pages:

- **Under 100,000 monthly listeners**
- **Under 1,000,000 streams on their top track**

Artists are sorted into:

- **Qualifies** — clears both thresholds, genuinely early-stage
- **Established** — already too big (one or both numbers blown past, or clear signs of existing representation/booking infrastructure)
- **Off genre** — doesn't fit pop regardless of size, kept for the record rather than deleted
- **Unverified** — flagged by a source but not yet checked against Spotify

As of the last update: 63 artists tracked, 15 qualifying, 42 established, 6 off genre, across 25 distinct sources.

## Sources

Compiled from public trade press, editorial "artists to watch" features, and — most usefully — niche music newsletters that publish weekly rather than as a one-off annual list:

- **Hear Hear** (Substack) and **One Write Music** (Substack) — full archives reviewed
- **DIY Magazine**'s weekly Neu Bulletin
- **Notion Magazine**'s weekly Undiscovered series
- Spotify's own public artist pages (checked logged-out) for the actual listener/stream numbers

Not a live feed yet — every number is a manually verified snapshot with a checked-at date. The plan is to wire this to a real API backend for continuous, automatically refreshing coverage.

## Running it locally

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4174/`.

## Files

- `index.html`, `app.js`, `styles.css` — the dashboard
- `data.js` — the artist data, hand-curated and cited per entry
