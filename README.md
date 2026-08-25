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

As of the last update: 70 artists tracked, 19 qualifying, 45 established, 6 off genre, across **29 registered sources** — 14 actively contributing artist data, plus the 15 below that are confirmed as real, on-topic sources but not yet mined.

## Sources

Compiled from public trade press, editorial "artists to watch" features, and — most usefully — niche music newsletters that publish weekly rather than as a one-off annual list:

- **Hear Hear** (Substack) and **One Write Music** (Substack) — full archives reviewed
- **DIY Magazine**'s weekly Neu Bulletin
- **Notion Magazine**'s weekly Undiscovered series
- **SongsBrew**'s RADAR series (songsbrew.com/radar) — weekly submission-based artist mixes; strong hit rate (4 qualifiers found from one pass through the recent archive)
- Spotify's own public artist pages (checked logged-out) for the actual listener/stream numbers

### Social / curator accounts (added, not yet fully mined)

Instagram-based music discovery accounts identified as candidate sources. Bios confirmed; artist-level scouting from these hasn't been done yet.

| Account | What it is |
|---|---|
| [@musicistoblame](https://www.instagram.com/musicistoblame/) | "music is to blame." — indie music zine/magazine, platform for under-represented artists |
| [@cassette.tech](https://www.instagram.com/cassette.tech/) | Cassette Technologies — music-sharing platform with playlist & curator spotlights |
| [@grrrlmusic](https://www.instagram.com/grrrlmusic/) | Music discovery curators (Kelsey + Ashley); also runs @grrrlmusicdoesdistro |
| [@whoisblankblog](https://www.instagram.com/whoisblankblog/) | "Who Is Blank" — explicitly pop/indie emerging-artist spotlight blog |
| [@salt_lick_incubator](https://www.instagram.com/salt_lick_incubator/) | Salt Lick Incubator — nonprofit artist incubator (already the source for Carter Benjamin) |
| [@offtherecordwisaiah](https://www.instagram.com/offtherecordwisaiah/) | "Off The Record w/ Isaiah" — LA-based music discovery personality |
| [@listenwithdavid](https://www.instagram.com/listenwithdavid/) | Music discovery + physical media |
| [@wsjuradio](https://www.instagram.com/wsjuradio/) | WSJU Radio — St. John's University college radio; weekly picks, artist radar |

*(@thesongsbrew isn't listed separately here — it's the same outlet as SongsBrew above, which is already active.)*

### Indie press & communities (added, not yet fully mined)

| Source | What it is |
|---|---|
| [Indie Music News](https://indiemusic.news) | Indie music directory/news site — reviews and coverage across rock, pop, electronic, hip-hop, folk |
| [Under the Radar](https://www.undertheradarmag.com) | Long-running indie music magazine (founded 2001) — broke Fleet Foxes and Vampire Weekend before mainstream press |
| [r/indieheads](https://www.reddit.com/r/indieheads/) | 2M+ member Reddit community, influential enough that publications cite it as a source; artists do AMAs there |
| [Stereogum](https://stereogum.com) | Established indie music blog, runs a regular "Band to Watch" column |
| [Indie Shuffle](https://www.indieshuffle.com) | Music discovery/curation site across indie rock, electronic, pop |
| [IndiePulse Music](https://indiepulsemusic.com) | Indie music magazine + record label for unsigned artists, reviews/interviews/news |
| [The Indie Scene](https://www.theindiescene.co.uk) | UK music journalism site — interviews, reviews, curated playlists |

Not a live feed yet — every number is a manually verified snapshot with a checked-at date. The plan is to wire this to a real API backend for continuous, automatically refreshing coverage.

## Running it locally

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4174/`.

## Files

- `index.html`, `app.js`, `styles.css` — the dashboard
- `data.js` — the artist data, hand-curated and cited per entry
