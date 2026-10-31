import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LiveIncidentRow } from "@/lib/canonical-statistics";

type MapMode = "light" | "dark";
const STYLES: Record<MapMode, string> = { light: "https://tiles.openfreemap.org/styles/liberty", dark: "https://tiles.openfreemap.org/styles/dark" };
const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL || "https://photon.komoot.io/api/";

function validPoint(row: LiveIncidentRow) {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && row.latitude! >= -90 && row.latitude! <= 90 && row.longitude! >= -180 && row.longitude! <= 180;
}

export function StatisticsIncidentMap({ rows }: { rows: LiveIncidentRow[] }) {
  const [mode, setMode] = useState<MapMode>("light");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const markers = rows.filter(validPoint);
  const markerSignature = markers.map((row) => `${row.incident_id}:${row.latitude}:${row.longitude}`).join("|");

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: STYLES[mode], center: [37.9, -0.2], zoom: 6, cooperativeGestures: true, attributionControl: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.on("error", () => setSearchError("Map provider is unavailable; the filtered statistics remain available below."));
    map.on("load", () => {
      if (markers.length) {
        const bounds = new maplibregl.LngLatBounds([markers[0].longitude!, markers[0].latitude!], [markers[0].longitude!, markers[0].latitude!]);
        markers.forEach((row) => bounds.extend([row.longitude!, row.latitude!]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
      }
      map.addSource("statistics-incidents", { type: "geojson", cluster: true, clusterMaxZoom: 14, clusterRadius: 48, data: { type: "FeatureCollection", features: markers.map((row) => ({ type: "Feature", properties: { title: row.incident_id, severity: row.severity ?? "Unknown", road: row.road ?? "", href: row.report_id ? `/reports/${row.report_id}` : "" }, geometry: { type: "Point", coordinates: [row.longitude!, row.latitude!] } })) } });
      map.addLayer({ id: "statistics-clusters", type: "circle", source: "statistics-incidents", filter: ["has", "point_count"], paint: { "circle-color": mode === "dark" ? "#f6c453" : "#0b5cad", "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30] } });
      map.addLayer({ id: "statistics-cluster-count", type: "symbol", source: "statistics-incidents", filter: ["has", "point_count"], layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: "statistics-unclustered", type: "circle", source: "statistics-incidents", filter: ["!", ["has", "point_count"]], paint: { "circle-color": mode === "dark" ? "#f6c453" : "#d83b3b", "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.on("click", "statistics-clusters", (event) => { const feature = map.queryRenderedFeatures(event.point, { layers: ["statistics-clusters"] })[0]; const clusterId = feature.properties?.cluster_id; if (clusterId === undefined) return; (map.getSource("statistics-incidents") as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId, (error, zoom) => { if (!error && zoom !== undefined) map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom }); }); });
      map.on("click", "statistics-unclustered", (event) => { const feature = event.features?.[0]; if (!feature) return; const properties = feature.properties ?? {}; new maplibregl.Popup().setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).setText(`${properties.severity ?? "Unknown severity"} · ${properties.road || "Verified incident location"}`).addTo(map); });
      map.on("mouseenter", "statistics-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "statistics-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "statistics-unclustered", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "statistics-unclustered", () => { map.getCanvas().style.cursor = ""; });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [mode, markerSignature]);

  const searchPlace = async () => {
    const value = query.trim();
    if (value.length < 3 || !mapRef.current) return;
    setSearching(true); setSearchError(null);
    try {
      const url = new URL(GEOCODER_URL); url.searchParams.set("q", `${value}, Kenya`); url.searchParams.set("limit", "1");
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Place search is temporarily unavailable.");
      const payload = await response.json() as { features?: Array<{ geometry?: { coordinates?: unknown }; properties?: { name?: string; city?: string; county?: string } }> };
      const coordinates = payload.features?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || !Number.isFinite(Number(coordinates[0])) || !Number.isFinite(Number(coordinates[1]))) throw new Error("No place was found.");
      const point: [number, number] = [Number(coordinates[0]), Number(coordinates[1])];
      mapRef.current.flyTo({ center: point, zoom: 13 });
      new maplibregl.Popup().setLngLat(point).setText(`Exploratory place search: ${payload.features?.[0]?.properties?.name ?? value}. This is not an incident marker.`).addTo(mapRef.current);
    } catch (cause) { setSearchError((cause as Error).message); } finally { setSearching(false); }
  };

  return <figure className="overflow-hidden rounded-xl border border-border bg-muted"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2"><div><p className="text-sm font-semibold">Approved incident map</p><p className="text-xs text-muted-foreground">{markers.length} verified coordinate{markers.length === 1 ? "" : "s"}; unknown locations remain unpinned.</p></div><div className="flex rounded border border-border p-0.5" role="group" aria-label="Statistics map style">{(["light", "dark"] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded px-2 py-1 text-xs font-semibold capitalize ${mode === option ? "bg-brand-blue text-white" : "text-muted-foreground hover:bg-muted"}`}>{option}</button>)}</div></div><div className="flex flex-wrap gap-2 border-b border-border bg-card p-3"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchPlace(); }} placeholder="Search a place to explore" aria-label="Search a place on the statistics map" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm" /><button type="button" onClick={() => void searchPlace()} disabled={searching || query.trim().length < 3} className="h-9 rounded-md bg-brand-blue px-3 text-sm font-semibold text-white disabled:opacity-50">{searching ? "Searching…" : "Search"}</button>{searchError ? <p className="basis-full text-xs text-destructive">{searchError}</p> : null}</div><div ref={containerRef} className="h-80 w-full" aria-label="Interactive approved incident statistics map" /><figcaption className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">Clusters group approved, deduplicated incidents. Search results are exploratory and never create incident markers. Map data © OpenFreeMap contributors · Search © OpenStreetMap contributors via Photon.</figcaption></figure>;
}
