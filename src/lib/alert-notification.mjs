export const ALERT_RADIUS_CHOICES_KM = [5, 10, 20, 50, 100, 250];

export function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

export function normalizeRadiusKm(value) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return 20;
  return Math.min(500, Math.max(1, Math.round(radius)));
}

export function distanceKm(first, second) {
  if (!isValidCoordinate(first?.latitude, first?.longitude)
    || !isValidCoordinate(second?.latitude, second?.longitude)) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(second.latitude - first.latitude);
  const dLon = radians(second.longitude - first.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function isPublicActiveAlert(alert) {
  return alert?.status === "active";
}

export function matchesAlertPreference(alert, preference, now = new Date()) {
  if (!isPublicActiveAlert(alert) || preference?.alerts === false) return false;
  if (preference?.mute_until && new Date(preference.mute_until) > now) return false;

  const counties = Array.isArray(preference?.county_filters) ? preference.county_filters : [];
  const roads = Array.isArray(preference?.road_ids) ? preference.road_ids : [];
  const radiusEnabled = preference?.radius_enabled === true;
  const distance = radiusEnabled
    && isValidCoordinate(preference?.latitude, preference?.longitude)
    ? distanceKm(
      { latitude: preference.latitude, longitude: preference.longitude },
      { latitude: alert.latitude, longitude: alert.longitude },
    )
    : null;
  const radiusMatch = distance !== null && distance <= normalizeRadiusKm(preference.radius_km);
  const countyMatch = counties.length > 0 && counties.includes(alert.county);
  const roadMatch = roads.length > 0 && roads.includes(alert.road_id);

  // Geography is an OR group; content filters are an AND group. With no
  // configured geography, do not broaden the subscription to every alert.
  if (!(radiusMatch || countyMatch || roadMatch)) return false;

  const hazardTypes = Array.isArray(preference?.hazard_types) ? preference.hazard_types : [];
  const severities = Array.isArray(preference?.severities) ? preference.severities : [];
  if (hazardTypes.length > 0 && !hazardTypes.includes(alert.hazard_type)) return false;
  if (severities.length > 0 && !severities.includes(alert.severity)) return false;
  return true;
}

export function notificationDedupeKey(alertId) {
  return `alert:${alertId}:nearby`;
}
