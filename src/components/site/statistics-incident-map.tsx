import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { clusterIncidentRows, hasVerifiedCoordinates } from "@/lib/statistics.mjs";

export type StatisticsMapIncident = {
  id: string;
  title: string;
  county: string;
  road: string | null;
  road_id: string | null;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
  severity: string;
  fatalities: number | null;
  casualties: number | null;
};

const MIN_LATITUDE = -5;
const MAX_LATITUDE = 5.2;
const MIN_LONGITUDE = 33.8;
const MAX_LONGITUDE = 42.1;

// Simplified 1:110m Natural Earth Kenya boundary. The outline is context only;
// incidents remain separate point data and no roads or local boundaries are
// inferred. Natural Earth data is public domain.
const KENYA_BOUNDARY: ReadonlyArray<readonly [longitude: number, latitude: number]> = [
  [39.20222, -4.67677],
  [37.7669, -3.67712],
  [37.69869, -3.09699],
  [34.07262, -1.05982],
  [33.903711, -0.95],
  [33.893569, 0.109814],
  [34.18, 0.515],
  [34.6721, 1.17694],
  [35.03599, 1.90584],
  [34.59607, 3.05374],
  [34.47913, 3.5556],
  [34.005, 4.249885],
  [34.620196, 4.847123],
  [35.298007, 5.506],
  [35.817448, 5.338232],
  [35.817448, 4.776966],
  [36.159079, 4.447864],
  [36.855093, 4.447864],
  [38.120915, 3.598605],
  [38.43697, 3.58851],
  [38.67114, 3.61607],
  [38.89251, 3.50074],
  [39.559384, 3.42206],
  [39.85494, 3.83879],
  [40.76848, 4.25702],
  [41.1718, 3.91909],
  [41.855083, 3.918912],
  [40.98105, 2.78452],
  [40.993, -0.85829],
  [41.58513, -1.68325],
  [40.88477, -2.08255],
  [40.63785, -2.49979],
  [40.26304, -2.57309],
  [40.12119, -3.27768],
  [39.80006, -3.68116],
  [39.60489, -4.34653],
  [39.20222, -4.67677],
];

function position(latitude: number, longitude: number) {
  return {
    left: `${((longitude - MIN_LONGITUDE) / (MAX_LONGITUDE - MIN_LONGITUDE)) * 100}%`,
    top: `${(1 - (latitude - MIN_LATITUDE) / (MAX_LATITUDE - MIN_LATITUDE)) * 100}%`,
  };
}

function boundaryPoints() {
  return KENYA_BOUNDARY.map(([longitude, latitude]) => {
    const { left, top } = position(latitude, longitude);
    return `${parseFloat(left)} ${parseFloat(top)}`;
  }).join(" ");
}

function incidentSummary(incident: StatisticsMapIncident) {
  const fatalities =
    incident.fatalities === null ? "deaths not confirmed" : `${incident.fatalities} deaths`;
  const casualties =
    incident.casualties === null ? "injuries not confirmed" : `${incident.casualties} injured`;
  return `${incident.county} · ${fatalities} · ${casualties}`;
}

export function StatisticsIncidentMap({ incidents }: { incidents: StatisticsMapIncident[] }) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const mappableIncidents = useMemo(() => incidents.filter(hasVerifiedCoordinates), [incidents]);
  const clusters = useMemo(() => clusterIncidentRows(mappableIncidents), [mappableIncidents]);
  const selected = clusters.find((cluster) => cluster.id === selectedCluster);

  return (
    <section className="mt-8" aria-labelledby="statistics-map-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            id="statistics-map-heading"
            className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
          >
            Incident map
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mappableIncidents.length} approved report{mappableIncidents.length === 1 ? "" : "s"}{" "}
            with verified coordinates. Linked duplicates and incidents without coordinates are
            excluded.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Clusters group nearby reports; they do not create incidents.
        </p>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className="relative min-h-[22rem] overflow-hidden rounded-lg border border-border bg-card p-3 sm:min-h-[30rem]"
          role="region"
          aria-label="Interactive geographic map of approved Share Barabara incident reports"
        >
          <div className="pointer-events-none absolute inset-3 rounded border border-border/70 bg-[linear-gradient(to_right,transparent_49.8%,var(--border)_50%,transparent_50.2%),linear-gradient(to_bottom,transparent_49.8%,var(--border)_50%,transparent_50.2%)] opacity-50" />
          <svg
            className="pointer-events-none absolute inset-3 size-[calc(100%-1.5rem)]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              points={boundaryPoints()}
              fill="var(--primary)"
              fillOpacity="0.08"
              stroke="var(--primary)"
              strokeOpacity="0.55"
              strokeWidth="0.35"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            className="pointer-events-none absolute left-[49%] top-[48%] text-[0.65rem] font-semibold text-primary/70"
            aria-hidden="true"
          >
            Kenya
          </span>
          <div
            className="absolute inset-x-4 top-4 flex justify-between text-[0.65rem] text-muted-foreground"
            aria-hidden="true"
          >
            <span>33.8°E</span>
            <span>42.1°E</span>
          </div>
          <div
            className="absolute inset-x-4 bottom-4 flex justify-between text-[0.65rem] text-muted-foreground"
            aria-hidden="true"
          >
            <span>5°S</span>
            <span>5.2°N</span>
          </div>
          {clusters.map((cluster) => {
            const clusterPosition = position(cluster.latitude, cluster.longitude);
            if (cluster.members.length === 1) {
              const incident = cluster.members[0] as StatisticsMapIncident;
              return (
                <Link
                  key={cluster.id}
                  to="/reports/$reportId"
                  params={{ reportId: incident.id }}
                  className="absolute z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-destructive text-xs font-bold text-destructive-foreground shadow transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={clusterPosition}
                  title={`${incident.title}: ${incidentSummary(incident)}`}
                  aria-label={`Open incident ${incident.title}. ${incidentSummary(incident)}`}
                >
                  •
                </Link>
              );
            }
            return (
              <button
                key={cluster.id}
                type="button"
                className="absolute z-20 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground shadow transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                style={clusterPosition}
                onClick={() =>
                  setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)
                }
                aria-expanded={selectedCluster === cluster.id}
                aria-label={`Show ${cluster.members.length} clustered incidents`}
              >
                {cluster.members.length}
              </button>
            );
          })}
          {!clusters.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No approved reports with verified coordinates match these filters.
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-border bg-card p-4" aria-live="polite">
          <h4 className="font-semibold">Map details</h4>
          {selected ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.members.length} nearby incidents
              </p>
              <ul className="mt-3 space-y-3">
                {selected.members.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: incident.id }}
                      className="text-sm font-semibold text-brand-blue underline"
                    >
                      {incident.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {incidentSummary(incident)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Select a cluster to inspect its canonical incident links. Select a single marker to
              open its report.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
