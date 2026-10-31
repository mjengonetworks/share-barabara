import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Coordinate = [number, number];
type MapMode = "light" | "dark";
export type MapMarker = { id: string; longitude: number; latitude: number; title: string; href?: string };

const MAP_STYLES: Record<MapMode, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

function extractCoordinates(value: unknown): Coordinate[] {
  if (!value || typeof value !== "object") return [];
  const geometry = value as { type?: string; coordinates?: unknown; geometry?: unknown };
  if (geometry.type === "Feature" && geometry.geometry) return extractCoordinates(geometry.geometry);
  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.filter((point): point is Coordinate => Array.isArray(point) && point.length >= 2 && point.every((n) => typeof n === "number"));
  }
  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((line) => extractCoordinates({ type: "LineString", coordinates: line }));
  }
  return [];
}

function lineFeature(coordinates: Coordinate[]) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } };
}

/** Shared MapLibre road map using OpenFreeMap Liberty/Dark styles. */
export function RoadGeometryMap({ geometry, source, markers = [] }: { geometry: unknown; source?: string | null; markers?: MapMarker[] }) {
  const coordinates = useMemo(() => extractCoordinates(geometry), [geometry]);
  const hasGeometry = coordinates.length >= 2;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mode, setMode] = useState<MapMode>("light");
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    setMapError(false);
    const map = new maplibregl.Map({ container: containerRef.current, style: MAP_STYLES[mode], attributionControl: true, cooperativeGestures: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.on("error", () => setMapError(true));
    map.on("load", () => {
      if (hasGeometry) {
        const lons = coordinates.map(([lon]) => lon);
        const lats = coordinates.map(([, lat]) => lat);
        const bounds = new maplibregl.LngLatBounds([lons[0], lats[0]], [lons[0], lats[0]]);
        coordinates.forEach((coordinate) => bounds.extend(coordinate));
        map.addSource("verified-road-geometry", { type: "geojson", data: lineFeature(coordinates) });
        map.addLayer({ id: "verified-road-line", type: "line", source: "verified-road-geometry", paint: { "line-color": mode === "dark" ? "#f6c453" : "#0b5cad", "line-width": 4 } });
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      } else {
        if (markers.length) {
          const bounds = new maplibregl.LngLatBounds([markers[0].longitude, markers[0].latitude], [markers[0].longitude, markers[0].latitude]);
          markers.forEach((marker) => bounds.extend([marker.longitude, marker.latitude]));
          map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
        } else {
          map.setCenter([37.9, -0.2]);
          map.setZoom(6);
        }
      }
      if (markers.length) {
        map.addSource("verified-map-markers", {
          type: "geojson",
          data: { type: "FeatureCollection", features: markers.map((marker) => ({ type: "Feature", properties: { title: marker.title, href: marker.href ?? "" }, geometry: { type: "Point", coordinates: [marker.longitude, marker.latitude] } })) },
        });
        map.addLayer({ id: "verified-map-markers", type: "circle", source: "verified-map-markers", paint: { "circle-color": mode === "dark" ? "#f6c453" : "#d83b3b", "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.on("click", "verified-map-markers", (event) => {
          const feature = event.features?.[0];
          if (!feature || !feature.properties) return;
          new maplibregl.Popup().setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(`<strong>${String(feature.properties.title ?? "Verified location")}</strong>`).addTo(map);
        });
        map.on("mouseenter", "verified-map-markers", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "verified-map-markers", () => { map.getCanvas().style.cursor = ""; });
      }
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [coordinates, mode, markers]);

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Map style</span>
        <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Map style">
          {(["light", "dark"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded px-2.5 py-1 text-xs font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === option ? "bg-brand-blue text-white" : "text-muted-foreground hover:bg-muted"}`}>{option}</button>
          ))}
        </div>
      </div>
      {mapError ? <p className="border-b border-border bg-card px-3 py-2 text-sm text-muted-foreground">Map provider is unavailable. Verified geometry is retained, but the interactive map could not load.</p> : null}
      <div ref={containerRef} className="h-72 w-full" aria-label="Interactive verified road geometry map" />
      <figcaption className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">{hasGeometry ? `Map context from verified road geometry${source ? ` · Source: ${source}` : ""}.` : markers.length ? "General map context with verified incident locations only." : "General Kenya map context; no verified road geometry or incident marker is shown."} Incident markers are shown separately only when coordinates are verified. Map data © OpenFreeMap contributors.</figcaption>
    </figure>
  );
}
