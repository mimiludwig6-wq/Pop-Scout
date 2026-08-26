import { unstable_cache } from "next/cache";

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

export const CACHE_TAG = "pop-scout";

export type Status = "Qualifies" | "Established" | "Off Genre" | "Unverified";

export type Artist = {
  id: string;
  name: string;
  genre: string[];
  status: Status;
  monthlyListeners: number | null;
  topTrack: string;
  topTrackStreams: number | null;
  signal: string;
  source: string;
  sourceUrl: string;
  spotifyUrl: string;
  spotifyArtistId: string;
  imageUrl: string;
  checkedAt: string | null;
  added: string | null;
  shortlisted: boolean;
  priority: string;
  repStatus: string;
  label: string;
  territory: string;
};

export type Source = {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  cadence: string;
  lastMined: string | null;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in ` +
        `(or set it in the Vercel project's Environment Variables).`
    );
  }
  return v;
}

async function notion(path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${requireEnv("NOTION_TOKEN")}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Notion ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json();
}

/** Walk every page of a database query — Notion caps each response at 100. */
async function queryAll(databaseId: string): Promise<any[]> {
  const pages: any[] = [];
  let cursor: string | undefined;

  do {
    const data = await notion(`/databases/${databaseId}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// --- property readers -----------------------------------------------------
// Every one tolerates a missing property, so renaming a column in Notion
// degrades that one field instead of breaking the whole page.

const pTitle = (p: any): string => p?.title?.[0]?.plain_text ?? "";
const pText = (p: any): string =>
  p?.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
const pNum = (p: any): number | null =>
  typeof p?.number === "number" ? p.number : null;
const pUrl = (p: any): string => p?.url ?? "";
const pSelect = (p: any): string => p?.select?.name ?? "";
const pMulti = (p: any): string[] =>
  p?.multi_select?.map((s: any) => s.name) ?? [];
const pDate = (p: any): string | null => p?.date?.start ?? null;
const pCheck = (p: any): boolean => p?.checkbox === true;
const pRelationIds = (p: any): string[] =>
  p?.relation?.map((r: any) => r.id) ?? [];

// --- fetchers -------------------------------------------------------------

async function fetchSources(): Promise<Source[]> {
  const pages = await queryAll(requireEnv("NOTION_SOURCES_DB"));

  return pages.map((page) => {
    const p = page.properties ?? {};
    return {
      id: page.id,
      name: pTitle(p["Name"]),
      url: pUrl(p["URL"]),
      type: pSelect(p["Type"]),
      status: pSelect(p["Status"]),
      cadence: pSelect(p["Cadence"]),
      lastMined: pDate(p["Last Mined"]),
    };
  });
}

async function fetchArtists(sources: Source[]): Promise<Artist[]> {
  const pages = await queryAll(requireEnv("NOTION_ARTISTS_DB"));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  return pages.map((page) => {
    const p = page.properties ?? {};
    const relId = pRelationIds(p["Source"])[0];

    return {
      id: page.id,
      name: pTitle(p["Name"]),
      genre: pMulti(p["Genre"]),
      status: (pSelect(p["Status"]) || "Unverified") as Status,
      monthlyListeners: pNum(p["Monthly Listeners"]),
      topTrack: pText(p["Top Track"]),
      topTrackStreams: pNum(p["Top Track Streams"]),
      signal: pText(p["Signal"]),
      source: (relId && sourceName.get(relId)) || "",
      sourceUrl: pUrl(p["Source URL"]),
      spotifyUrl: pUrl(p["Spotify URL"]),
      spotifyArtistId: pText(p["Spotify Artist ID"]),
      imageUrl: pUrl(p["Image URL"]),
      checkedAt: pDate(p["Checked At"]),
      added: pDate(p["Added"]),
      shortlisted: pCheck(p["Shortlisted"]),
      priority: pSelect(p["Priority"]),
      repStatus: pSelect(p["Rep Status"]),
      label: pText(p["Label"]),
      territory: pSelect(p["Territory"]),
    };
  });
}

/**
 * Cached for an hour and tagged, so editing Notion shows up within the hour on
 * its own — or immediately if you hit /api/revalidate.
 */
export const getRoster = unstable_cache(
  async (): Promise<{ artists: Artist[]; sources: Source[] }> => {
    const sources = await fetchSources();
    const artists = await fetchArtists(sources);

    artists.sort((a, b) => {
      const av = a.monthlyListeners ?? Number.POSITIVE_INFINITY;
      const bv = b.monthlyListeners ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });

    return { artists, sources };
  },
  ["pop-scout-roster"],
  { revalidate: 3600, tags: [CACHE_TAG] }
);
