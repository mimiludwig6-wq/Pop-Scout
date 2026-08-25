const state = {
  search: "",
  status: "qualifies",
  listenerCap: "",
  sortBy: "listeners-asc",
};

// Nothing is hidden from the data — every researched artist stays in ARTISTS.
// The dashboard just defaults to the "Qualifies" filter so the default view
// stays focused; switch to "All candidates", "Established", or "Off genre" to see everyone.
const shortlist = new Set();

const resultsList = document.getElementById("resultsList");
const emptyState = document.getElementById("emptyState");
const statsRow = document.getElementById("statsRow");
const resultsCount = document.getElementById("resultsCount");
const shortlistList = document.getElementById("shortlistList");
const shortlistCount = document.getElementById("shortlistCount");
const shortlistEmpty = document.getElementById("shortlistEmpty");
const copyStatus = document.getElementById("copyStatus");

function formatNumber(n) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("en-US");
}

function abbreviate(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

function statusLabel(status) {
  if (status === "qualifies") return "Qualifies";
  if (status === "unverified") return "Unverified";
  if (status === "off_genre") return "Off Genre";
  return "Established";
}

function renderStats() {
  const total = ARTISTS.length;
  const qualifies = ARTISTS.filter((a) => a.status === "qualifies").length;
  const unverified = ARTISTS.filter((a) => a.status === "unverified").length;
  // Baseline source count from before the newsletter/press/Instagram round of
  // additions, plus every one of the 16 links added since — see README.
  const baselineSources = 26;
  const sources = baselineSources + REGISTERED_SOURCES.length;

  statsRow.innerHTML = `
    <div class="stat"><span class="stat-value">${total}</span><span class="stat-label">Tracked</span></div>
    <div class="stat"><span class="stat-value">${qualifies}</span><span class="stat-label">Qualify</span></div>
    <div class="stat"><span class="stat-value">${unverified}</span><span class="stat-label">Unverified</span></div>
    <div class="stat"><span class="stat-value">${sources}</span><span class="stat-label">Sources</span></div>
  `;
}

function applyFilters() {
  let rows = ARTISTS.slice();

  if (state.status !== "all") {
    rows = rows.filter((a) => a.status === state.status);
  }

  if (state.listenerCap) {
    const cap = Number(state.listenerCap);
    rows = rows.filter((a) => a.monthlyListeners !== null && a.monthlyListeners <= cap);
  }

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    rows = rows.filter((a) =>
      [a.name, a.genre, a.source, a.signal].join(" ").toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => {
    if (state.sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (state.sortBy === "status") return a.status.localeCompare(b.status);
    const av = a.monthlyListeners ?? Infinity;
    const bv = b.monthlyListeners ?? Infinity;
    return state.sortBy === "listeners-desc" ? bv - av : av - bv;
  });

  return rows;
}

function renderResults() {
  const rows = applyFilters();
  emptyState.hidden = rows.length > 0;
  resultsCount.textContent = `${rows.length} candidate${rows.length === 1 ? "" : "s"}`;

  resultsList.innerHTML = rows
    .map((a) => {
      const listeners = formatNumber(a.monthlyListeners);
      const streams = formatNumber(a.topTrackStreams);
      const selected = shortlist.has(a.name);
      const spotifyUrl = a.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(a.name)}`;
      const spotifyLabel = a.spotifyUrl ? "Spotify" : "Spotify (search)";
      const badgeContent = a.imageUrl
        ? `<img class="badge-img" src="${a.imageUrl}" alt="${a.name}" loading="lazy">`
        : `<strong>${abbreviate(a.monthlyListeners)}</strong><span>Monthly</span>`;
      return `
        <article class="result-card">
          <div class="badge">
            ${badgeContent}
          </div>
          <div class="card-body">
            <div class="card-top">
              <h3>${a.name}</h3>
              <span class="card-genre">${a.genre}</span>
              <span class="pill ${a.status}">${statusLabel(a.status)}</span>
            </div>
            <p class="card-signal">${a.signal}</p>
            <div class="card-meta">
              <span>Listeners: <strong>${listeners ?? "—"}</strong></span>
              <span>Top track: <strong>${streams ?? "—"}</strong></span>
              <span><a href="${a.sourceUrl}" target="_blank" rel="noopener">${a.source}</a></span>
              <span><a href="${spotifyUrl}" target="_blank" rel="noopener">${spotifyLabel}</a></span>
            </div>
          </div>
          <div class="card-actions">
            <button class="add-btn ${selected ? "selected" : ""}" data-name="${a.name}">
              ${selected ? "Shortlisted" : "Shortlist"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  resultsList.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      if (shortlist.has(name)) shortlist.delete(name);
      else shortlist.add(name);
      renderResults();
      renderShortlist();
    });
  });
}

function renderShortlist() {
  const items = ARTISTS.filter((a) => shortlist.has(a.name));
  shortlistCount.textContent = `${items.length} selected`;
  shortlistEmpty.hidden = items.length > 0;

  shortlistList.innerHTML = items
    .map(
      (a) => `
        <div class="shortlist-item">
          <span>${a.name}</span>
          <button data-name="${a.name}" aria-label="Remove ${a.name}">&times;</button>
        </div>
      `
    )
    .join("");

  shortlistList.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      shortlist.delete(btn.dataset.name);
      renderResults();
      renderShortlist();
    });
  });
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderResults();
});

document.getElementById("statusFilter").addEventListener("click", (e) => {
  const btn = e.target.closest(".status-btn");
  if (!btn) return;
  state.status = btn.dataset.value;
  document
    .querySelectorAll("#statusFilter .status-btn")
    .forEach((b) => b.classList.toggle("active", b === btn));
  renderResults();
});

document.getElementById("listenerCap").addEventListener("change", (e) => {
  state.listenerCap = e.target.value;
  renderResults();
});

document.getElementById("sortBy").addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  renderResults();
});

document.getElementById("copyShortlist").addEventListener("click", async () => {
  const items = ARTISTS.filter((a) => shortlist.has(a.name));
  if (items.length === 0) {
    copyStatus.textContent = "Nothing to copy yet.";
    return;
  }
  const text = items
    .map((a) => `${a.name} — ${a.genre} — ${formatNumber(a.monthlyListeners) ?? "listeners unknown"} monthly listeners — ${a.source}`)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Copied to clipboard.";
  } catch {
    copyStatus.textContent = "Copy failed — select and copy manually.";
  }
  setTimeout(() => (copyStatus.textContent = ""), 2500);
});

renderStats();
renderResults();
renderShortlist();
