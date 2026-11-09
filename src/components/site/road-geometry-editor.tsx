import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";

type Coordinate = [number, number];
type EditMode = "point" | "route";

function readCoordinates(value: string): { mode: EditMode; points: Coordinate[] } {
  try {
    const parsed = JSON.parse(value) as any;
    const geometry = parsed?.type === "Feature" ? parsed.geometry : parsed;
    if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
      return { mode: "point", points: [geometry.coordinates.slice(0, 2) as Coordinate] };
    }
    if (geometry?.type === "LineString" && Array.isArray(geometry.coordinates)) {
      return { mode: "route", points: geometry.coordinates as Coordinate[] };
    }
    if (geometry?.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      return { mode: "route", points: geometry.coordinates.flat() as Coordinate[] };
    }
  } catch {
    // The textarea remains the source of truth until valid GeoJSON is supplied.
  }
  return { mode: "point", points: [] };
}

function serialize(mode: EditMode, points: Coordinate[]) {
  if (mode === "point") {
    return points[0]
      ? JSON.stringify({ type: "Point", coordinates: points[0] })
      : "";
  }
  return points.length
    ? JSON.stringify({ type: "LineString", coordinates: points })
    : "";
}

/**
 * Editor-reviewed geometry only.  A click adds an explicit point/waypoint;
 * no straight line is inferred or labelled as a verified road alignment.
 */
export function RoadGeometryEditor({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const parsed = useMemo(() => readCoordinates(value), [value]);
  const [mode, setMode] = useState<EditMode>(parsed.mode);
  const [points, setPoints] = useState<Coordinate[]>(parsed.points);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const modeRef = useRef(mode);
  const pointsRef = useRef(points);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  modeRef.current = mode;
  pointsRef.current = points;
  disabledRef.current = disabled;
  onChangeRef.current = onChange;

  useEffect(() => {
    setMode(parsed.mode);
    setPoints(parsed.points);
  }, [parsed.mode, parsed.points]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [37.9, -0.2], zoom: 6, cooperativeGestures: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("click", (event) => {
      if (disabledRef.current) return;
      const currentMode = modeRef.current;
      const currentPoints = pointsRef.current;
      const next = currentMode === "point" ? [[event.lngLat.lng, event.lngLat.lat] as Coordinate] : [...currentPoints, [event.lngLat.lng, event.lngLat.lat] as Coordinate];
      setPoints(next);
      onChangeRef.current(serialize(currentMode, next));
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = points.map((point, index) => {
      const marker = new maplibregl.Marker({ draggable: !disabled, color: mode === "point" ? "#d83b3b" : "#0b5cad" }).setLngLat(point).addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        const next = points.map((current, currentIndex) => currentIndex === index ? [position.lng, position.lat] as Coordinate : current);
        setPoints(next);
        onChange(serialize(mode, next));
      });
      return marker;
    });
    if (points.length) map.jumpTo({ center: points[0], zoom: Math.max(map.getZoom(), 10) });
  }, [disabled, mode, onChange, points]);

  const update = (next: Coordinate[]) => {
    setPoints(next);
    onChange(serialize(mode, next));
  };

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold" htmlFor="road-geometry-mode">Editing mode</label>
        <select id="road-geometry-mode" className="h-8 rounded border border-input bg-background px-2 text-xs" disabled={disabled} value={mode} onChange={(event) => { const nextMode = event.target.value as EditMode; setMode(nextMode); update(nextMode === "point" ? points.slice(0, 1) : points); }}>
          <option value="point">Single confirmed point</option>
          <option value="route">Ordered route waypoints</option>
        </select>
        <Button type="button" size="sm" variant="outline" disabled={disabled || !points.length} onClick={() => update([])}>Clear geometry</Button>
      </div>
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded bg-muted" aria-label="Interactive road geometry editor" />
      <p className="text-xs text-muted-foreground">Click the map to add a confirmed point or waypoint. Drag markers to adjust them; use the list to reorder or remove waypoints. Saving endpoints does not imply a verified alignment.</p>
      {mode === "route" && points.length ? <ol className="space-y-1 text-xs">{points.map((point, index) => <li key={`${point.join(",")}-${index}`} className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1"><span>Waypoint {index + 1}: {point[1].toFixed(5)}, {point[0].toFixed(5)}</span><span className="flex gap-1"><Button type="button" size="sm" variant="ghost" disabled={disabled || index === 0} onClick={() => { const next = [...points]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next); }}>↑</Button><Button type="button" size="sm" variant="ghost" disabled={disabled || index === points.length - 1} onClick={() => { const next = [...points]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; update(next); }}>↓</Button><Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => update(points.filter((_, currentIndex) => currentIndex !== index))}>Remove</Button></span></li>)}</ol> : null}
    </div>
  );
}
