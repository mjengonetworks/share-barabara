import { useEffect, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";
import { coordinateLabel, normalizeCoordinates } from "@/lib/location";

export function LocationButton({
  latitude,
  longitude,
  onLocate,
  idPrefix,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocate: (lat: number | null, lng: number | null) => void;
  idPrefix?: string;
}) {
  const { locate, loading, error } = useGeolocation();
  const [latitudeText, setLatitudeText] = useState(latitude == null ? "" : String(latitude));
  const [longitudeText, setLongitudeText] = useState(longitude == null ? "" : String(longitude));
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    setLatitudeText(latitude == null ? "" : String(latitude));
    setLongitudeText(longitude == null ? "" : String(longitude));
  }, [latitude, longitude]);

  const hasPoint = normalizeCoordinates(latitude, longitude) !== null;
  const applyManual = () => {
    const next = normalizeCoordinates(Number(latitudeText), Number(longitudeText));
    if (!next) {
      setManualError("Enter a latitude from -90 to 90 and longitude from -180 to 180.");
      return;
    }
    setManualError(null);
    onLocate(next.latitude, next.longitude);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={async () => {
          const pos = await locate();
          if (pos) onLocate(pos.lat, pos.lng);
        }}>
          <LocateFixed className="mr-1 size-4" />
          {loading ? "Locating…" : hasPoint ? "Refresh current point" : "Use my current point"}
        </Button>
        {hasPoint ? <Button type="button" variant="ghost" size="sm" onClick={() => { setManualError(null); onLocate(null, null); }}><X className="mr-1 size-4" />Clear point</Button> : null}
      </div>
      <div className="mt-3 grid max-w-md gap-2 sm:grid-cols-2">
        <div><Label htmlFor={`${idPrefix ?? "location"}-latitude`}>Latitude</Label><Input id={`${idPrefix ?? "location"}-latitude`} inputMode="decimal" value={latitudeText} onChange={(event) => setLatitudeText(event.target.value)} placeholder="e.g. -1.2864" /></div>
        <div><Label htmlFor={`${idPrefix ?? "location"}-longitude`}>Longitude</Label><Input id={`${idPrefix ?? "location"}-longitude`} inputMode="decimal" value={longitudeText} onChange={(event) => setLongitudeText(event.target.value)} placeholder="e.g. 36.8172" /></div>
      </div>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={applyManual}><MapPin className="mr-1 size-4" />Use entered coordinates</Button>
      {hasPoint ? <p className="mt-1 text-xs text-muted-foreground">Selected point: {coordinateLabel(normalizeCoordinates(latitude, longitude))}</p> : <p className="mt-1 text-xs text-muted-foreground">A point is optional. Map selection will be enabled when a reviewed map provider is configured.</p>}
      {manualError || error ? <p className="mt-1 text-xs text-destructive">{manualError ?? error}</p> : null}
    </div>
  );
}
