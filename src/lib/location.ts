export type Coordinates = { latitude: number; longitude: number };

export function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number" && Number.isFinite(latitude)
    && typeof longitude === "number" && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

/** Returns a complete coordinate pair, or null. Partial pairs are discarded. */
export function normalizeCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  return isValidCoordinate(latitude, longitude)
    ? { latitude, longitude: longitude as number }
    : null;
}

export function coordinateLabel(coordinates: Coordinates | null): string {
  return coordinates
    ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
    : "No point selected";
}

/** Public content may have a real 0,0 coordinate; it is not silently treated
 * as a user location or used as a fallback when coordinates are missing. */
export function hasCoordinates(value: { latitude?: unknown; longitude?: unknown } | null | undefined) {
  return !!value && isValidCoordinate(value.latitude, value.longitude);
}
