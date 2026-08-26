"use client";

import { useEffect, useState } from "react";

const KEY = "pop-scout-visitor";

/**
 * Asks for an email before revealing the roster, and logs each visit.
 *
 * Not a security boundary — the roster is already in the page payload, so
 * anyone who wants past this can. It's a courtesy sign-in that records who
 * says they're looking.
 */
export default function Gate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Log the return visit, then reveal. localStorage can throw in private
  // windows, so every access is guarded.
  useEffect(() => {
    let known: string | null = null;
    try {
      known = localStorage.getItem(KEY);
    } catch {
      known = null;
    }

    if (known) {
      setSignedIn(true);
      void fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: known }),
      }).catch(() => {});
    }

    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@,]+\.[a-z]{2,}$/i.test(value)) {
      setError("That doesn't look like an email address.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      // Logging is best-effort; a network failure shouldn't lock anyone out.
    }

    try {
      localStorage.setItem(KEY, value);
    } catch {
      // Private window — they'll be asked again next time. Fine.
    }

    setSignedIn(true);
  }

  // Render nothing until localStorage has been read, so returning visitors
  // don't see the form flash before it disappears.
  if (!ready) return null;
  if (signedIn) return <>{children}</>;

  return (
    <main id="top">
      <section className="gate">
        <span className="eyebrow">Scouting — Pop</span>
        <h1 className="hero-headline">
          Tracking the next wave
          <br />
          of pop before the labels do.
        </h1>
        <p className="hero-sub">
          A working watchlist of emerging pop artists, filtered down to acts
          still small enough to sign. Leave an email to take a look.
        </p>

        <form className="gate-form" onSubmit={submit}>
          <label htmlFor="gateEmail">Email</label>
          <div className="gate-row">
            <input
              id="gateEmail"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={busy}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? "…" : "Enter"}
            </button>
          </div>
          {error && <p className="gate-error">{error}</p>}
          <p className="gate-note">
            Recorded so I know who&rsquo;s seen the project — your address and
            the date you visited, nothing else. Not shared, not mailed, not
            passed on.
          </p>
        </form>
      </section>
    </main>
  );
}
