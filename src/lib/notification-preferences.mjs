import { distanceKm, isValidCoordinate, normalizeRadiusKm } from "./alert-notification.mjs";

export const NOTIFICATION_EVENT_GROUPS = ["alerts", "community", "account"];
export const NOTIFICATION_CUSTOMIZATION_SELECT = [
  "notifications_enabled", "in_app_enabled", "browser_enabled", "email_enabled", "push_enabled",
  "community_enabled", "account_enabled", "radius_enabled", "county_filters", "road_ids",
  "hazard_types", "excluded_hazard_types", "severities", "mute_until",
].join(",");
export const NOTIFICATION_CUSTOMIZATION_FIELDS = {
  notificationsEnabled: "notifications_enabled", inAppEnabled: "in_app_enabled", browserEnabled: "browser_enabled",
  communityEnabled: "community_enabled", accountEnabled: "account_enabled", radiusEnabled: "radius_enabled",
  countyFilters: "county_filters", roadIds: "road_ids", hazardTypes: "hazard_types",
  excludedHazards: "excluded_hazard_types", alertSeverities: "severities", muteUntil: "mute_until",
};

export function normalizeNotificationPreferenceRow(row = {}, defaults = {}) {
  const field = NOTIFICATION_CUSTOMIZATION_FIELDS;
  return {
    ...defaults,
    articles: row.articles ?? defaults.articles,
    reports: row.reports ?? defaults.reports,
    alerts: row.alerts ?? defaults.alerts,
    interactions: row.interactions ?? defaults.interactions,
    radius_km: row.radius_km ?? defaults.radius_km,
    latitude: row.latitude ?? defaults.latitude,
    longitude: row.longitude ?? defaults.longitude,
    notificationsEnabled: row[field.notificationsEnabled] ?? defaults.notificationsEnabled,
    inAppEnabled: row[field.inAppEnabled] ?? defaults.inAppEnabled,
    browserEnabled: row[field.browserEnabled] ?? defaults.browserEnabled,
    emailEnabled: row.email_enabled ?? defaults.emailEnabled,
    pushEnabled: row.push_enabled ?? defaults.pushEnabled,
    communityEnabled: row[field.communityEnabled] ?? row.interactions ?? defaults.communityEnabled,
    accountEnabled: row[field.accountEnabled] ?? defaults.accountEnabled,
    radiusEnabled: row[field.radiusEnabled] ?? defaults.radiusEnabled,
    countyFilters: Array.isArray(row[field.countyFilters]) ? row[field.countyFilters] : (defaults.countyFilters ?? []),
    roadIds: Array.isArray(row[field.roadIds]) ? row[field.roadIds] : (defaults.roadIds ?? []),
    hazardTypes: Array.isArray(row[field.hazardTypes]) ? row[field.hazardTypes] : (defaults.hazardTypes ?? []),
    excludedHazards: Array.isArray(row[field.excludedHazards]) ? row[field.excludedHazards] : (defaults.excludedHazards ?? []),
    alertSeverities: Array.isArray(row[field.alertSeverities]) ? row[field.alertSeverities] : (defaults.alertSeverities ?? []),
    muteUntil: row[field.muteUntil] ?? defaults.muteUntil ?? null,
  };
}

export function activeTaxonomyRows(rows = []) {
  return rows.filter((row) => row?.active !== false);
}

export function expandTaxonomySelection(rows, selected = []) {
  const active = activeTaxonomyRows(rows);
  const values = new Set(selected.filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of active) {
      if (row.parent_value && values.has(row.parent_value) && !values.has(row.value)) {
        values.add(row.value);
        changed = true;
      }
    }
  }
  return values;
}

export function taxonomySelectionMatches(rows, value, selected = [], excluded = []) {
  if (!value) return selected.length === 0 && excluded.length === 0;
  const included = selected.length === 0 || expandTaxonomySelection(rows, selected).has(value);
  const excludedValues = expandTaxonomySelection(rows, excluded);
  return included && !excludedValues.has(value);
}

export function notificationChannelEnabled(preference, channel = "in_app") {
  if (channel === "browser") return preference?.browser_enabled !== false;
  if (channel === "email") return preference?.email_enabled === true;
  if (channel === "push") return preference?.push_enabled === true;
  return preference?.in_app_enabled !== false;
}

export function matchesCustomAlertPreference(
  alert,
  preference,
  taxonomyRows = [],
  { channel = "in_app", now = new Date() } = {},
) {
  if (alert?.status !== "active") return false;
  if (preference?.alerts !== true) return false;
  if (!notificationChannelEnabled(preference, channel)) return false;
  if (preference?.mute_until && new Date(preference.mute_until) > now) return false;

  const counties = Array.isArray(preference?.county_filters) ? preference.county_filters : [];
  const roads = Array.isArray(preference?.road_ids) ? preference.road_ids : [];
  const radiusEnabled = preference?.radius_enabled === true;
  const distance = radiusEnabled
    && isValidCoordinate(preference?.latitude, preference?.longitude)
    && isValidCoordinate(alert?.latitude, alert?.longitude)
    ? distanceKm(
      { latitude: preference.latitude, longitude: preference.longitude },
      { latitude: alert.latitude, longitude: alert.longitude },
    )
    : null;
  const geographyMatches = (
    (distance !== null && distance <= normalizeRadiusKm(preference.radius_km))
    || (counties.length > 0 && counties.includes(alert?.county))
    || (roads.length > 0 && roads.includes(alert?.road_id))
  );
  if (!geographyMatches) return false;

  const severities = Array.isArray(preference?.severities) ? preference.severities : [];
  if (severities.length > 0 && !severities.includes(alert?.severity)) return false;
  return taxonomySelectionMatches(
    taxonomyRows,
    alert?.hazard_type,
    Array.isArray(preference?.hazard_types) ? preference.hazard_types : [],
    Array.isArray(preference?.excluded_hazard_types) ? preference.excluded_hazard_types : [],
  );
}

export function preferenceSummary(preference, taxonomyRows = []) {
  const selected = Array.isArray(preference?.hazardTypes) ? preference.hazardTypes : (Array.isArray(preference?.hazard_types) ? preference.hazard_types : []);
  const excluded = Array.isArray(preference?.excludedHazards) ? preference.excludedHazards : (Array.isArray(preference?.excluded_hazard_types) ? preference.excluded_hazard_types : []);
  const label = (value) => taxonomyRows.find((row) => row.value === value)?.label ?? value;
  const counties = preference?.countyFilters ?? preference?.county_filters ?? [];
  const roads = preference?.roadIds ?? preference?.road_ids ?? [];
  const radiusEnabled = preference?.radiusEnabled ?? preference?.radius_enabled;
  return {
    alerts: preference?.alerts === true,
    location: [
      ...(radiusEnabled ? [`within ${normalizeRadiusKm(preference.radius_km)} km`] : []),
      ...counties.map((county) => county),
      ...(roads.length ? [`${roads.length} saved road${roads.length === 1 ? "" : "s"}`] : []),
    ],
    includes: selected.length ? selected.map(label) : ["All alert types except exclusions"],
    excludes: excluded.map(label),
  };
}
