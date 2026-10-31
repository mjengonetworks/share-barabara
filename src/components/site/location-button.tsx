import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";
import { coordinateLabel, normalizeCoordinates } from "@/lib/location";

type PlaceResult = { label: string; latitude: number; longitude: number };
type MapMode = "light" | "dark";

const MAP_STYLES: Record<MapMode, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL || "https://photon.komoot.io/api/";

function resultLabel(properties: Record<string, unknown>) {
  return [properties.name, properties.street, properties.city, properties.county, properties.country]
    .filter((part, index, values): part is string => typeof part === "string" && Boolean(part) && values.indexOf(part) === index)
    .join(", ");
}

export function LocationButton({ latitude, longitude, onLocate, idPrefix }: { latitude: number | null; longitude: number | null; onLocate: (lat: number | null, lng: number | null) => void; idPrefix?: string }) {
  const { locate, loading, error } = useGeolocation();
  const [latitudeText, setLatitudeText] = useState(latitude == null ? "" : String(latitude));
  const [longitudeText, setLongitudeText] = useState(longitude == null ? "" : String(longitude));
  const [manualError, setManualError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("light");
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLatitudeText(latitude == null ? "" : String(latitude));
    setLongitudeText(longitude == null ? "" : String(longitude));
  }, [latitude, longitude]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 3) { setResults([]); setSearchError(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true); setSearchError(null);
      try {
        const url = new URL(GEOCODER_URL);
        url.searchParams.set("q", `${value}, Kenya`);
        url.searchParams.set("limit", "5");
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Place search is temporarily unavailable.");
        const payload = await response.json() as { features?: Array<{ geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }> };
        setResults((payload.features ?? []).flatMap((feature) => {
          const coordinates = feature.geometry?.coordinates;
          const longitude = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
          const latitude = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
          const label = resultLabel(feature.properties ?? {});
          return Number.isFinite(latitude) && Number.isFinite(longitude) && label ? [{ label, latitude, longitude }] : [];
        }));
      } catch (cause) {
        if ((cause as Error).name !== "AbortError") setSearchError((cause as Error).message);
      } finally { setSearching(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({ container: mapContainer.current, style: MAP_STYLES[mode], center: [longitude ?? 37.9, latitude ?? -0.2], zoom: latitude !== null && longitude !== null ? 13 : 6, cooperativeGestures: true, attributionControl: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.on("click", (event) => onLocate(event.lngLat.lat, event.lngLat.lng));
    if (latitude !== null && longitude !== null) new maplibregl.Marker({ color: mode === "dark" ? "#f6c453" : "#d83b3b" }).setLngLat([longitude, latitude]).addTo(map);
    return () => map.remove();
  }, [mode, latitude, longitude]);

  const hasPoint = normalizeCoordinates(latitude, longitude) !== null;
  const applyManual = () => {
    const next = normalizeCoordinates(Number(latitudeText), Number(longitudeText));
    if (!next) { setManualError("Enter a latitude from -90 to 90 and longitude from -180 to 180."); return; }
    setManualError(null); onLocate(next.latitude, next.longitude);
  };
  const selectPlace = (place: PlaceResult) => { setQuery(place.label); setResults([]); onLocate(place.latitude, place.longitude); };
  const prefix = idPrefix ?? "location";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={async () => { const pos = await locate(); if (pos) onLocate(pos.lat, pos.lng); }}><LocateFixed className="mr-1 size-4" />{loading ? "Locating…" : hasPoint ? "Refresh current point" : "Use my current point"}</Button>
        {hasPoint ? <Button type="button" variant="ghost" size="sm" onClick={() => { setManualError(null); setQuery(""); onLocate(null, null); }}><X className="mr-1 size-4" />Clear point</Button> : null}
      </div>
      <div className="relative mt-3 max-w-xl">
        <Label htmlFor={`${prefix}-place-search`}>Search a place</Label>
        <Search className="pointer-events-none absolute left-3 top-9 size-4 text-muted-foreground" />
        <Input id={`${prefix}-place-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a place, road or landmark" className="pl-9" autoComplete="off" />
        {query.trim().length >= 3 && (searching || results.length > 0 || searchError) ? <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card p-1 shadow-lg">{searching ? <p className="px-3 py-2 text-sm text-muted-foreground">Searching places…</p> : null}{results.map((place) => <button key={`${place.latitude}:${place.longitude}:${place.label}`} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)}>{place.label}</button>)}{searchError ? <p className="px-3 py-2 text-sm text-destructive">{searchError}</p> : null}</div> : null}
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2"><span className="text-xs font-semibold text-muted-foreground">Click the map to place the point</span><div className="flex rounded border border-border p-0.5" role="group" aria-label="Location map style">{(["light", "dark"] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded px-2 py-1 text-xs font-semibold capitalize ${mode === option ? "bg-brand-blue text-white" : "text-muted-foreground hover:bg-muted"}`}>{option}</button>)}</div></div>
        <div ref={mapContainer} className="h-56 w-full" aria-label="Searchable location map" />
        <p className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">Search is exploratory; coordinates are saved only after selection. Map data © OpenFreeMap contributors · Place search © OpenStreetMap contributors via Photon.</p>
      </div>
      <div className="mt-3 grid max-w-md gap-2 sm:grid-cols-2"><div><Label htmlFor={`${prefix}-latitude`}>Latitude</Label><Input id={`${prefix}-latitude`} inputMode="decimal" value={latitudeText} onChange={(event) => setLatitudeText(event.target.value)} placeholder="e.g. -1.2864" /></div><div><Label htmlFor={`${prefix}-longitude`}>Longitude</Label><Input id={`${prefix}-longitude`} inputMode="decimal" value={longitudeText} onChange={(event) => setLongitudeText(event.target.value)} placeholder="e.g. 36.8172" /></div></div>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={applyManual}><MapPin className="mr-1 size-4" />Use entered coordinates</Button>
      {hasPoint ? <p className="mt-1 text-xs text-muted-foreground">Selected point: {coordinateLabel(normalizeCoordinates(latitude, longitude))}</p> : <p className="mt-1 text-xs text-muted-foreground">A point is optional. No marker is created until a coordinate is selected or entered.</p>}
      {manualError || error ? <p className="mt-1 text-xs text-destructive">{manualError ?? error}</p> : null}
    </div>
  );
}
