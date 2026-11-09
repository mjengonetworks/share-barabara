import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { usePublicRoadDirectory } from "@/components/site/road-discovery";

export const Route = createFileRoute("/roads/")({ component: RoadsDirectoryPage });

function RoadsDirectoryPage() {
  const { data: roads = [], isLoading } = usePublicRoadDirectory();
  const [query, setQuery] = useState("");
  const filteredRoads = roads.filter((road) =>
    [road.name, road.slug, road.county, road.road_class]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
  );
  return (
    <main className="public-content-container py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Road safety discovery
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-brand-blue">Verified roads</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Browse the road entities Share Barabara has verified. Names, aliases and segments are not
        merged unless the data model confirms the identity.
      </p>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search verified roads"
        aria-label="Search verified roads"
        className="mt-5 max-w-xl"
      />
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading roads…</p> : null}
      {!isLoading && filteredRoads.length === 0 ? (
        <p className="mt-6 rounded border border-dashed border-border p-3 text-sm text-muted-foreground">
          No verified road records match this search.
        </p>
      ) : null}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRoads.map((road) => (
          <li key={road.id} className="rounded-lg border border-border bg-card p-4">
            <Link
              to="/roads/$slug"
              params={{ slug: road.slug }}
              className="font-semibold text-brand-blue underline"
            >
              {road.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {[road.road_class, road.county].filter(Boolean).join(" · ") || "Verified road record"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-blue">
              <Link to="/alerts" search={{ road: road.id } as never} className="underline">
                Alerts
              </Link>
              <Link to="/reports" search={{ road: road.id } as never} className="underline">
                Reports
              </Link>
              <Link to="/statistics" search={{ road: road.id } as never} className="underline">
                Statistics
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
