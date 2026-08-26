# Pop Scout

**Live: [pop-scout.vercel.app](https://pop-scout.vercel.app)**

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

As of the last refresh (26 Aug 2026): **70 artists tracked, 15 qualifying**, 49 established, 6 off genre, across **39 registered sources** — 14 actively producing artists, plus 25 confirmed on-topic but not yet mined.

Live numbers are read from Notion at request time, so the site and this README can drift; the site is authoritative.

The last refresh moved three artists out of *Qualifies* — Eileen Alister, AmiiFy and Lauren Auder each had a well-known single recorded as their top track rather than their most-played one, and all three are in fact well over the stream cap. That failure mode is the reason the roster gets re-checked rather than trusted: a watchlist of artists who are already too big is worse than no watchlist.

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
| [@thesongsbrew](https://www.instagram.com/thesongsbrew/) | SongsBrew's Instagram — same publication as the RADAR series above, tracked as its own source |

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

### Newsletters & discovery tools (added, not yet fully mined)

| Source | What it is |
|---|---|
| [@triflingfool](https://substack.com/@triflingfool) | Substack music newsletter |
| [The Discover Tab](https://substack.com/@thediscovertab) | Substack music discovery newsletter |
| [@musicben](https://substack.com/@musicben) | Substack music newsletter |
| [Gnoosic](https://offlinecrush.substack.com/i/162210426/gnoosic) | Taste-based artist recommendation tool, via Offline Crush's discovery-tools roundup |
| [Radio Garden](https://offlinecrush.substack.com/i/162210426/radio-garden) | Global live radio discovery map, via Offline Crush |
| [Poolsuite](https://offlinecrush.substack.com/i/162210426/poolsuite) | Curated retro-leaning playlist/radio site, via Offline Crush |
| [Radiooooo](https://offlinecrush.substack.com/i/162210426/radiooooo) | Music discovery by time period and place, via Offline Crush |
| [Musicmap](https://offlinecrush.substack.com/i/162210426/musicmap) | Interactive genre-lineage map, via Offline Crush |
| [Every Noise at Once](https://offlinecrush.substack.com/i/162210426/everynoise) | Algorithmically generated map of Spotify genres, via Offline Crush |

The six "via Offline Crush" tools above are all referenced from a single Offline Crush Substack post rounding up music-discovery tools, rather than being outlets that publish artist coverage themselves — registered as candidate sources per request, but their actual usefulness for finding signable pop acts (versus general genre/taste exploration) hasn't been evaluated yet.

## How the data stays current

The roster lives in Notion and the site reads it at request time, so editing a row changes the site without a redeploy.

Listener and stream counts are **verified by hand** against Spotify's public artist pages, each stamped with the date it was checked. That's deliberate rather than a shortcut: Spotify's Web API exposes neither monthly listeners nor per-track play counts, so an API integration could not supply the two numbers this entire filter rests on. Both exist only on the public artist page.

Re-checking is a documented workflow — [`.claude/skills/refresh-roster/`](.claude/skills/refresh-roster/SKILL.md) — covering the parts that are easy to get wrong:

- The play-count column renders only above ~1500px viewport width, and only in a foregrounded tab. Narrower or backgrounded, the page silently shows track durations instead.
- Spotify's "Popular" list is ordered by its own ranking, not by plays, so **the first track shown is frequently not the most-played one**. Reading it as the top track is what put three artists in the qualifying list who were several million streams over the cap.

Getting these numbers on a schedule would mean a paid vendor such as Songstats or Chartmetric, which is the natural next step if this ever needed to scale past manual re-checks.

## Running it locally

```bash
npm install && npm run dev
```

Then open `http://localhost:3000`. Needs `.env.local` — see
[DEPLOY.md](DEPLOY.md) for setup and deployment.

## Layout

- `app/`, `components/`, `lib/` — the Next.js app, reading live from Notion
- `notion/` — database schema, import CSVs, and a rebuild script
- `.claude/skills/refresh-roster/` — the workflow for re-gathering artist data
  from Spotify's public pages and writing it back to Notion
- `legacy/` — the original static prototype (`index.html` + a hardcoded
  `data.js`). Kept for reference; nothing depends on it.
