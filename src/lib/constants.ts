export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;

/** Who was involved, for both alerts and accident reports. A crash can have more than one. */
export const PARTIES_INVOLVED = [
  { value: "pedestrian", label: "Pedestrian" },
  { value: "cyclist", label: "Cyclist" },
  { value: "motorcyclist", label: "Motorcyclist" },
  { value: "passenger", label: "Passenger (incl. driver)" },
  { value: "other", label: "Other" },
] as const;

/** Optional sub-breakdown for the "passenger" party, which kind of vehicle
 *  they were in. All vehicle occupants are bundled under one party at the
 *  top level; this is where the detail can live if someone has it. */
export const PASSENGER_VEHICLE_TYPES = [
  { value: "car", label: "Car" },
  { value: "matatu_bus", label: "Matatu / bus" },
  { value: "van", label: "Van" },
  { value: "truck_lorry", label: "Truck / lorry" },
] as const;

/** Optional sub-breakdown for the "motorcyclist" party. */
export const MOTORCYCLIST_SUBTYPES = [
  { value: "private", label: "Private rider" },
  { value: "boda_boda", label: "Boda boda (commercial)" },
] as const;

export const STRUCTURE_TYPES = [
  { value: "road", label: "Road surface" },
  { value: "bridge", label: "Bridge" },
  { value: "drainage", label: "Drainage" },
  { value: "signage", label: "Signage" },
  { value: "streetlight", label: "Street lighting" },
  { value: "footbridge", label: "Footbridge / pedestrian crossing" },
  { value: "other", label: "Other" },
] as const;

export const ROAD_AUTHORITIES = [
  { value: "KeNHA", label: "KeNHA (national trunk roads)" },
  { value: "KURA", label: "KURA (urban roads)" },
  { value: "KeRRA", label: "KeRRA (rural roads)" },
  { value: "County Government", label: "County Government" },
  { value: "Other", label: "Other" },
] as const;

export const EMERGENCY_CONTACTS = [
  { name: "Police / Emergency", number: "999 or 112" },
  { name: "St John Ambulance", number: "0721 225 285" },
  { name: "Kenya Red Cross (E-Plus)", number: "1199" },
  { name: "NTSA Hotline", number: "0709 932 000" },
  { name: "KeNHA Highway Assistance", number: "0800 950 000" },
];
