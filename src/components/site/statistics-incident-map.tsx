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

function position(latitude: number, longitude: number) {
  return {
    left: `${((longitude - MIN_LONGITUDE) / (MAX_LONGITUDE - MIN_LONGITUDE)) * 100}%`,
    top: `${(1 - (latitude - MIN_LATITUDE) / (MAX_LATITUDE - MIN_LATITUDE)) * 100}%`,
  };
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
