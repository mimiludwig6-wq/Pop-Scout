import Dashboard from "@/components/dashboard";
import Gate from "@/components/gate";
import { getRoster } from "@/lib/notion";

// Server Component. The roster comes from Notion at request time (cached an
// hour, tagged for on-demand busting) — so editing a row in Notion changes the
// live site with no redeploy. That's the whole point of the migration.
export const revalidate = 3600;

export default async function Page() {
  let artists;
  let sources;

  try {
    ({ artists, sources } = await getRoster());
  } catch (error) {
    return (
      <main id="top">
        <section className="hero">
          <span className="eyebrow">Scouting — Pop</span>
          <h1 className="hero-headline">Can&rsquo;t reach Notion.</h1>
        </section>
        <div className="error-panel">
          <h2>The roster didn&rsquo;t load</h2>
          <p>
            Everything else is wired up — this is almost always a missing or
            mistyped environment variable, or a database that hasn&rsquo;t been
            shared with the integration yet.
          </p>
          <p>
            In Notion, open each database, hit the <strong>•••</strong> menu →{" "}
            <strong>Connections</strong>, and add your integration. Then confirm{" "}
            <strong>NOTION_TOKEN</strong>, <strong>NOTION_ARTISTS_DB</strong>,
            and <strong>NOTION_SOURCES_DB</strong>.
          </p>
          <code>{error instanceof Error ? error.message : String(error)}</code>
        </div>
      </main>
    );
  }

  return (
    <Gate>
      <Dashboard artists={artists} sources={sources} />
    </Gate>
  );
}
