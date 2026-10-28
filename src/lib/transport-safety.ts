/** Stable values shared with the canonical statistics migration. */
export const TRANSPORT_MODES = [
  { value: "road", label: "Road" },
  { value: "rail", label: "Rail" },
  { value: "aviation", label: "Aviation" },
  { value: "maritime", label: "Maritime" },
  { value: "inland_water", label: "Inland water transport" },
  { value: "other", label: "Other / multimodal" },
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];

export const TRANSPORT_INCIDENT_TYPES: Record<TransportMode, readonly { value: string; label: string }[]> = {
  road: [
    { value: "vehicle_collision", label: "Vehicle collision" },
    { value: "pedestrian_collision", label: "Pedestrian collision" },
    { value: "motorcycle_collision", label: "Motorcycle-related collision" },
    { value: "vehicle_rollover", label: "Vehicle rollover" },
    { value: "other_road_incident", label: "Other verified road incident" },
  ],
  rail: [
    { value: "train_collision", label: "Train collision" },
    { value: "derailment", label: "Derailment" },
    { value: "level_crossing_incident", label: "Level-crossing incident" },
    { value: "rail_passenger_worker_incident", label: "Passenger or worker incident" },
    { value: "other_rail_incident", label: "Other verified railway incident" },
  ],
  aviation: [
    { value: "aircraft_crash", label: "Aircraft crash" },
    { value: "runway_incident", label: "Runway incident" },
    { value: "emergency_landing", label: "Emergency landing" },
    { value: "ground_handling_incident", label: "Ground-handling incident" },
    { value: "other_aviation_incident", label: "Other verified aviation incident" },
  ],
  maritime: [
    { value: "vessel_collision", label: "Vessel collision" },
    { value: "grounding", label: "Grounding" },
    { value: "maritime_passenger_incident", label: "Maritime passenger incident" },
    { value: "other_maritime_incident", label: "Other verified maritime incident" },
  ],
  inland_water: [
    { value: "capsizing", label: "Capsizing" },
    { value: "passenger_ferry_incident", label: "Passenger ferry incident" },
    { value: "waterway_collision", label: "Waterway collision" },
    { value: "other_water_incident", label: "Other verified inland-water incident" },
  ],
  other: [{ value: "other_transport_incident", label: "Other verified transport incident" }],
};

export function transportIncidentOptions(mode: TransportMode) {
  return TRANSPORT_INCIDENT_TYPES[mode];
}
