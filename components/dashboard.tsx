"use client";

import { useMemo, useState } from "react";

import type { Artist, Source, Status } from "@/lib/notion";

const STATUS_FILTERS: { label: string; value: Status | "all" }[] = [
  { label: "All candidates", value: "all" },
  { label: "Qualifies", value: "Qualifies" },
  { label: "Unverified", value: "Unverified" },
  { label: "Established", value: "Established" },
  { label: "Off genre", value: "Off Genre" },
];

function formatNumber(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

function abbreviate(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

/** "Off Genre" -> "off_genre", matching the pill classes in globals.css. */
const statusClass = (status: Status) => status.toLowerCase().replace(/\s+/g, "_");

function mostRecent(dates: (string | null)[]): string | null {
  const valid = dates.filter((d): d is string => Boolean(d)).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

export default function Dashboard({
  artists,
  sources,
}: {
  artists: Artist[];
  sources: Source[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("Qualifies");
  const [listenerCap, setListenerCap] = useState("");
  const [sortBy, setSortBy] = useState("listeners-asc");
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [copyStatus, setCopyStatus] = useState("");

  const stats = useMemo(
    () => ({
      total: artists.length,
      qualifies: artists.filter((a) => a.status === "Qualifies").length,
      unverified: artists.filter((a) => a.status === "Unverified").length,
      // Live count of rows in the Sources database — no hardcoded baseline.
      sources: sources.length,
    }),
    [artists, sources]
  );

  const lastSynced = useMemo(
    () => mostRecent(artists.map((a) => a.lastSynced)),
    [artists]
  );
  const lastChecked = useMemo(
    () => mostRecent(artists.map((a) => a.checkedAt)),
    [artists]
  );

  const rows = useMemo(() => {
    let out = artists.slice();

    if (status !== "all") out = out.filter((a) => a.status === status);

    if (listenerCap) {
      const cap = Number(listenerCap);
      out = out.filter(
        (a) => a.monthlyListeners !== null && a.monthlyListeners <= cap
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((a) =>
        [a.name, a.genre.join(" "), a.source, a.signal, a.label, a.territory]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return out.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "popularity-desc") return (b.popularity ?? -1) - (a.popularity ?? -1);
      const av = a.monthlyListeners ?? Number.POSITIVE_INFINITY;
      const bv = b.monthlyListeners ?? Number.POSITIVE_INFINITY;
      return sortBy === "listeners-desc" ? bv - av : av - bv;
    });
  }, [artists, status, listenerCap, search, sortBy]);

  const shortlisted = useMemo(
    () => artists.filter((a) => shortlist.has(a.id)),
    [artists, shortlist]
  );

  function toggleShortlist(id: string) {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyShortlist() {
    if (shortlisted.length === 0) {
      setCopyStatus("Nothing to copy yet.");
      setTimeout(() => setCopyStatus(""), 2500);
      return;
    }

    const text = shortlisted
      .map(
        (a) =>
          `${a.name} — ${a.genre.join(" / ")} — ${
            formatNumber(a.monthlyListeners)
          } monthly listeners — ${a.source}`
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Copy failed — select and copy manually.");
    }
    setTimeout(() => setCopyStatus(""), 2500);
  }

  return (
    <main id="top">
      <section className="hero">
        <span className="eyebrow">Scouting — Pop</span>
        <h1 className="hero-headline">
          Tracking the next wave
          <br />
          of pop before the labels do.
        </h1>
        <p className="hero-sub">
          A working watchlist of emerging pop artists, built from trade press,
          niche newsletters, and Spotify&rsquo;s public artist data — filtered
          down to acts still small enough to sign.
        </p>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Tracked</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.qualifies}</span>
            <span className="stat-label">Qualify</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.unverified}</span>
            <span className="stat-label">Unverified</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.sources}</span>
            <span className="stat-label">Sources</span>
          </div>
        </div>

        <div className="sync-note">
          <span>
            {lastSynced ? (
              <>
                Followers and popularity auto-refresh from the Spotify API —
                last sync <strong>{lastSynced}</strong>.
              </>
            ) : (
              <>
                Automated Spotify refresh is <strong>not running yet</strong> —
                the Web API requires the app owner to hold Spotify Premium.
              </>
            )}
          </span>
          <span>
            Every figure here is human-verified
            {lastChecked ? (
              <>
                {" "}
                — last check <strong>{lastChecked}</strong>
              </>
            ) : null}
            . Spotify&rsquo;s API exposes neither monthly listeners nor
            per-track play counts, so those stay manual regardless.
          </span>
        </div>
      </section>

      <div className="rule" />

      <section className="statement">
        <h2>
          SIGNAL
          <br />
          BEFORE
          <br />
          SCALE.
        </h2>
      </section>

      <div className="rule" />

      <section className="workspace">
        <aside className="filter-panel" id="filters">
          <span className="eyebrow">Filters</span>

          <label htmlFor="searchInput">Search</label>
          <input
            type="text"
            id="searchInput"
            placeholder="Artist, genre, or source…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label>Status</label>
          <div className="status-stack">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`status-btn${status === f.value ? " active" : ""}`}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label htmlFor="listenerCap">Max monthly listeners</label>
          <select
            id="listenerCap"
            value={listenerCap}
            onChange={(e) => setListenerCap(e.target.value)}
          >
            <option value="">No cap</option>
            <option value="100000">Under 100K</option>
            <option value="50000">Under 50K</option>
            <option value="10000">Under 10K</option>
          </select>

          <label htmlFor="sortBy">Sort</label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="listeners-asc">Monthly listeners — low to high</option>
            <option value="listeners-desc">Monthly listeners — high to low</option>
            <option value="popularity-desc">Spotify popularity — high to low</option>
            <option value="name-asc">Name — A to Z</option>
            <option value="status">Status</option>
          </select>

          <div className="divider" />

          <span className="eyebrow">Shortlist</span>
          <div className="shortlist-head">
            <span className="shortlist-count">
              {shortlisted.length} selected
            </span>
            <button className="copy-btn" onClick={copyShortlist}>
              Copy
            </button>
          </div>

          <div className="shortlist-list">
            {shortlisted.map((a) => (
              <div className="shortlist-item" key={a.id}>
                <span>{a.name}</span>
                <button
                  onClick={() => toggleShortlist(a.id)}
                  aria-label={`Remove ${a.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {shortlisted.length === 0 && (
            <p className="shortlist-empty">
              No artists shortlisted yet. Add candidates from the roster.
            </p>
          )}

          <span className="copy-status">{copyStatus}</span>
        </aside>

        <section className="results" id="results">
          <div className="results-header">
            <span className="eyebrow">
              {rows.length} candidate{rows.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="results-list">
            {rows.map((a) => {
              const selected = shortlist.has(a.id);
              const spotifyUrl =
                a.spotifyUrl ||
                `https://open.spotify.com/search/${encodeURIComponent(a.name)}`;

              return (
                <article className="result-card" key={a.id}>
                  <div className="badge">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="badge-img"
                        src={a.imageUrl}
                        alt={a.name}
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <strong>{abbreviate(a.monthlyListeners)}</strong>
                        <span>Monthly</span>
                      </>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="card-top">
                      <h3>{a.name}</h3>
                      <span className="card-genre">{a.genre.join(" / ")}</span>
                      <span className={`pill ${statusClass(a.status)}`}>
                        {a.status}
                      </span>
                    </div>

                    <p className="card-signal">{a.signal}</p>

                    <div className="card-meta">
                      <span>
                        Listeners: <strong>{formatNumber(a.monthlyListeners)}</strong>
                      </span>
                      <span>
                        Top track: <strong>{formatNumber(a.topTrackStreams)}</strong>
                      </span>
                      {a.followers !== null && (
                        <span>
                          Followers: <strong>{abbreviate(a.followers)}</strong>
                        </span>
                      )}
                      {a.popularity !== null && (
                        <span>
                          <span className="pop-meter">
                            Popularity
                            <span className="pop-bar">
                              <span style={{ width: `${a.popularity}%` }} />
                            </span>
                            <strong>{a.popularity}</strong>
                          </span>
                        </span>
                      )}
                      {a.source && (
                        <span>
                          <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">
                            {a.source}
                          </a>
                        </span>
                      )}
                      <span>
                        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
                          {a.spotifyUrl ? "Spotify" : "Spotify (search)"}
                        </a>
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className={`add-btn${selected ? " selected" : ""}`}
                      onClick={() => toggleShortlist(a.id)}
                    >
                      {selected ? "Shortlisted" : "Shortlist"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {rows.length === 0 && (
            <p className="empty-state">No artists match these filters.</p>
          )}
        </section>
      </section>

      <div className="rule" />

      <footer id="methodology">
        <span className="eyebrow">Methodology</span>
        <p>
          Curated in Notion and served live — editing a row updates this page
          without a redeploy. Monthly listeners and top-track streams are
          verified by hand and stamped with the date they were last checked,
          because Spotify&rsquo;s Web API exposes neither number; getting them
          on a schedule would mean a paid data vendor such as Songstats or
          Chartmetric. A daily job is wired up to refresh the figures the API
          {" "}<em>does</em> serve — followers, popularity, artist images — but
          Spotify gates Web API access on the app owner holding an active
          Premium subscription, so it stays dormant until that is in place.
        </p>
      </footer>
    </main>
  );
}
