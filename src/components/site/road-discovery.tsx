import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PublicRoad = {
  id: string;
  name: string;
  slug: string;
  county: string | null;
  road_class: string | null;
  created_at: string;
};

export function useLatestPublicRoads() {
  return useQuery({
    queryKey: ["public-road-discovery", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("id,name,slug,county,road_class,created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as PublicRoad[];
    },
    staleTime: 60_000,
  });
}

export function usePublicRoadDirectory() {
  return useQuery({
    queryKey: ["public-road-discovery", "directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("id,name,slug,county,road_class,created_at")
        .order("name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PublicRoad[];
    },
    staleTime: 60_000,
  });
}

export function RoadDiscovery({ compact = false }: { compact?: boolean }) {
  const { data: roads = [], isLoading } = useLatestPublicRoads();
  return (
    <section
      className={`public-content-container ${compact ? "py-3" : "py-4"}`}
      aria-labelledby="road-discovery-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Road safety discovery
          </p>
          <h2 id="road-discovery-heading" className="mt-1 text-xl font-bold text-brand-navy">
            Browse by road
          </h2>
        </div>
        <Link to="/roads" className="text-sm font-semibold text-brand-blue underline">
          View all roads
        </Link>
      </div>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading verified roads…</p>
      ) : null}
      {!isLoading && roads.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-border p-3 text-sm text-muted-foreground">
          No verified road records are available yet.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {roads.map((road) => (
            <Link
              key={road.id}
              to="/roads/$slug"
              params={{ slug: road.slug }}
              className="min-w-0 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="flex items-start gap-2 font-semibold text-brand-blue">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                {road.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[road.road_class, road.county].filter(Boolean).join(" · ") ||
                  "Verified road record"}
              </p>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-3 rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        Most viewed roads in the last 24 hours will appear when genuine timestamped road-page
        analytics are available. No ranking is fabricated.
      </div>
    </section>
  );
}

export function RoadFilterLinks({ kind }: { kind: "alerts" | "reports" }) {
  const { data: roads = [], isLoading } = useLatestPublicRoads();
  if (isLoading || roads.length === 0) return null;
  return (
    <section
      className="mt-4 rounded-lg border border-border bg-card p-4"
      aria-labelledby={`${kind}-road-discovery-heading`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Verified associations
          </p>
          <h2 id={`${kind}-road-discovery-heading`} className="mt-1 text-lg font-bold">
            Browse {kind} by road
          </h2>
        </div>
        <Link to="/roads" className="text-sm font-semibold text-brand-blue underline">
          View all roads
        </Link>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={`Browse ${kind} by road`}>
        {roads.map((road) => (
          <Link
            key={road.id}
            to={`/${kind}` as never}
            search={{ road: road.id } as never}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-brand-blue hover:border-accent"
          >
            {road.name}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Only records with a confirmed road association are included; unknown associations remain in
        the overall results.
      </p>
    </section>
  );
}
