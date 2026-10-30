import { useMemo } from "react";

type Coordinate = [number, number];

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

/**
 * Renders an OSM interactive map only when an attributed LineString or
 * MultiLineString is present. No midpoint or AI-generated coordinate is used
 * as a substitute for missing geometry.
 */
export function RoadGeometryMap({ geometry, source }: { geometry: unknown; source?: string | null }) {
  const coordinates = useMemo(() => extractCoordinates(geometry), [geometry]);
  if (coordinates.length < 2) {
    return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Verified road geometry is not available yet; incidents without coordinates remain unpinned.</p>;
  }
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padLon = Math.max((maxLon - minLon) * 0.12, 0.002);
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.002);
  const bbox = `${minLon - padLon},${minLat - padLat},${maxLon + padLon},${maxLat + padLat}`;
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted">
      <iframe
        title="Verified road geometry map"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`}
        className="h-72 w-full border-0"
        loading="lazy"
      />
      <figcaption className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Map context from verified road geometry{source ? ` · Source: ${source}` : ""}. Incident markers are shown separately only when coordinates are verified.
      </figcaption>
    </figure>
  );
}
