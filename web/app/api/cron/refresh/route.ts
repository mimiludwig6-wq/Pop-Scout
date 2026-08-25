import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  CACHE_TAG,
  listArtistsForSync,
  updateArtistMetrics,
} from "@/lib/notion";
import { getAccessToken, getArtists } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refreshes the fields Spotify's API actually exposes — followers, popularity,
 * artist image — and stamps Last Synced. Monthly listeners and top-track
 * streams are deliberately untouched: the API doesn't serve them, so they stay
 * human-verified. See lib/spotify.ts.
 *
 * Runs daily via the schedule in vercel.json. Vercel sends the CRON_SECRET as a
 * bearer token automatically; the same secret works for manual runs.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set on this deployment." },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  const fromQuery = new URL(request.url).searchParams.get("secret");
  if (auth !== `Bearer ${secret}` && fromQuery !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const artists = await listArtistsForSync();
    if (artists.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, note: "No artists carry a Spotify Artist ID yet." });
    }

    const token = await getAccessToken();
    const metrics = await getArtists(
      token,
      artists.map((a) => a.spotifyArtistId)
    );
    const byId = new Map(metrics.map((m) => [m.id, m]));

    let updated = 0;
    const missing: string[] = [];

    for (const artist of artists) {
      const m = byId.get(artist.spotifyArtistId);
      if (!m) {
        missing.push(artist.spotifyArtistId);
        continue;
      }

      await updateArtistMetrics(artist.pageId, {
        followers: m.followers,
        popularity: m.popularity,
        imageUrl: m.imageUrl,
      });
      updated++;

      // Notion allows ~3 requests/second.
      await new Promise((r) => setTimeout(r, 340));
    }

    revalidateTag(CACHE_TAG);

    return NextResponse.json({
      ok: true,
      updated,
      skipped: missing.length,
      unrecognisedIds: missing,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
