import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CACHE_TAG } from "@/lib/notion";

export const dynamic = "force-dynamic";

/**
 * Drops the Notion cache immediately instead of waiting out the hour.
 *
 * Point a Notion automation at this, or just open it in a browser after making
 * a batch of edits:
 *   https://<your-app>.vercel.app/api/revalidate?secret=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set on this deployment." },
      { status: 500 }
    );
  }

  const provided =
    new URL(request.url).searchParams.get("secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(CACHE_TAG);
  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}

export const POST = GET;
