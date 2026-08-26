/**
 * Spotify Web API — Client Credentials flow.
 *
 * A deliberate note on scope: this API does NOT expose monthly listeners or
 * per-track play counts. It gives followers, a 0-100 popularity score, genres,
 * and images. Monthly listeners exist only on the public artist page and in
 * Spotify for Artists, so those stay human-verified in Notion with a
 * `Checked At` date. Popularity is a momentum signal, not a listener count,
 * and the dashboard labels it as such.
 */

export type SpotifyArtist = {
  id: string;
  followers: number;
  popularity: number;
  imageUrl?: string;
};

/**
 * Spotify gates Web API access on the app owner holding an active Premium
 * subscription. Credentials can be perfectly valid and still get a 403 here,
 * so this is worth distinguishing from a transient failure — nothing about
 * retrying or rotating keys will fix it.
 */
export class SpotifyEntitlementError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "SpotifyEntitlementError";
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} — see web/.env.example.`);
  return v;
}

export async function getAccessToken(): Promise<string> {
  const creds = Buffer.from(
    `${requireEnv("SPOTIFY_CLIENT_ID")}:${requireEnv("SPOTIFY_CLIENT_SECRET")}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Spotify token ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/** Spotify takes up to 50 artist ids per request. */
export async function getArtists(
  token: string,
  ids: string[]
): Promise<SpotifyArtist[]> {
  const out: SpotifyArtist[] = [];

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const res = await fetch(
      `https://api.spotify.com/v1/artists?ids=${batch.join(",")}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 403 && /premium/i.test(body)) {
        throw new SpotifyEntitlementError(body.trim());
      }
      throw new Error(`Spotify artists ${res.status}: ${body}`);
    }

    const data = await res.json();
    for (const a of data.artists ?? []) {
      if (!a) continue; // Spotify returns null for ids it doesn't recognise
      out.push({
        id: a.id,
        followers: a.followers?.total ?? 0,
        popularity: a.popularity ?? 0,
        imageUrl: a.images?.[0]?.url,
      });
    }
  }

  return out;
}
