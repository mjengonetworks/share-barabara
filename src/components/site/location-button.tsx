import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";

export function LocationButton({
  latitude,
  longitude,
  onLocate,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocate: (lat: number, lng: number) => void;
}) {
  const { locate, loading, error } = useGeolocation();
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          const pos = await locate();
          if (pos) onLocate(pos.lat, pos.lng);
        }}
      >
        <LocateFixed className="mr-1 size-4" />
        {loading ? "Locating…" : latitude ? "Location captured" : "Use my location"}
      </Button>
      {latitude && longitude ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
