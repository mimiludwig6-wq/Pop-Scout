import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Records a self-reported visitor email.
 *
 * This is a visitor log, NOT authentication. Nothing is verified — anyone can
 * submit any address, including someone else's. Treat every row as a claim.
 *
 * The endpoint has to be public for visitors to reach it, which means it can
 * be submitted to by anyone who finds it. Validation and the per-instance rate
 * limit below reduce casual abuse; they do not make it tamper-proof. Don't put
 * anything behind this that actually needs protecting.
 */

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

// Deliberately strict-ish but not clever: over-engineered email regexes reject
// valid addresses. This catches typos and junk, nothing more.
const EMAIL = /^[^\s@]+@[^\s@,]+\.[a-z]{2,}$/i;

// Best-effort throttle. Serverless instances are ephemeral and not shared, so
// this blunts repeat submissions from one warm instance rather than enforcing
// a global limit.
const seen = new Map<string, number>();
const WINDOW_MS = 60_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > WINDOW_MS) seen.delete(k);
  const last = seen.get(key);
  seen.set(key, now);
  return last !== undefined && now - last < 2_000;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function notion(path: string, method: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("NOTION_TOKEN")}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(request: Request) {
  let email: string;

  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json(
      { error: "That doesn't look like an email address." },
      { status: 400 }
    );
  }

  if (rateLimited(email)) {
    // Already counted a moment ago — treat as success so a double-submit or a
    // quick refresh doesn't show the visitor an error.
    return NextResponse.json({ ok: true, throttled: true });
  }

  const db = requireEnv("NOTION_VISITORS_DB");
  const today = new Date().toISOString();

  try {
    // One row per address: look for an existing one before creating.
    const existing = await notion(`/databases/${db}/query`, "POST", {
      page_size: 1,
      filter: { property: "Email", title: { equals: email } },
    });

    const row = existing.results?.[0];

    if (row) {
      const visits = (row.properties?.Visits?.number ?? 0) + 1;
      await notion(`/pages/${row.id}`, "PATCH", {
        properties: {
          Visits: { number: visits },
          "Last Seen": { date: { start: today } },
        },
      });
      return NextResponse.json({ ok: true, returning: true });
    }

    await notion("/pages", "POST", {
      parent: { database_id: db },
      properties: {
        Email: { title: [{ text: { content: email } }] },
        "First Seen": { date: { start: today } },
        "Last Seen": { date: { start: today } },
        Visits: { number: 1 },
      },
    });

    return NextResponse.json({ ok: true, returning: false });
  } catch (error) {
    // Never block someone from reading the site because logging failed.
    console.error("signin log failed:", error);
    return NextResponse.json({ ok: true, logged: false });
  }
}
