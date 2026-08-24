import { useState } from "react";

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Location is not supported on this device");
        resolve(null);
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          setLoading(false);
          setError(err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  return { locate, loading, error };
}
