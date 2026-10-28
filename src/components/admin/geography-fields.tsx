import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KENYA_COUNTIES } from "@/lib/constants";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { TRANSPORT_MODES, transportIncidentOptions, type TransportMode } from "@/lib/transport-safety";
import { useUnifiedGeographySchema } from "@/hooks/useUnifiedGeographySchema";
import { TransportEntitySelector } from "@/components/admin/transport-entity-selector";

export function GeographyFields({
  countryCode,
  adminAreaId,
  transportMode,
  incidentType,
  showIncidentType = true,
  transportEntityId,
  onChange,
}: {
  countryCode: string;
  adminAreaId: string;
  transportMode: string;
  incidentType: string;
  showIncidentType?: boolean;
  transportEntityId: string | null;
  onChange: (patch: Record<string, string>) => void;
}) {
  const schema = useUnifiedGeographySchema();
  const [countrySearch, setCountrySearch] = useState("");
  const countries = useMemo(() => COUNTRY_OPTIONS.filter((country) => `${country.name} ${country.code}`.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 80), [countrySearch]);
  const kenya = countryCode === "KE";
  const knownMode = TRANSPORT_MODES.some((mode) => mode.value === transportMode);
  const incidentOptions = knownMode ? transportIncidentOptions(transportMode as TransportMode) : [];

  if (!schema.data?.available) {
    return <div className="rounded border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">Country, international region and transport-mode persistence are awaiting the reviewed additive geography schema. Existing road and county fields remain active.</div>;
  }

  return <section className="space-y-4 rounded border border-border bg-muted/20 p-4" aria-labelledby="geography-transport-heading">
    <div><h2 id="geography-transport-heading" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Geography and transport</h2><p className="mt-1 text-xs text-muted-foreground">New records default to Kenya. Existing values are preserved until you change them.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="country-search">Country</Label><Input id="country-search" value={countrySearch || COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.name || countryCode} onChange={(event) => setCountrySearch(event.target.value)} placeholder="Search country" autoComplete="off" /><div className="mt-1 max-h-44 overflow-y-auto rounded border border-border bg-card">{countries.map((country) => <button type="button" key={country.code} className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${country.code === countryCode ? "bg-muted" : ""}`} onClick={() => { onChange({ country_code: country.code, admin_area_id: "" }); setCountrySearch(country.name); }}>{country.name} <span className="text-xs text-muted-foreground">({country.code})</span></button>)}</div></div>
      <div><Label>Administrative area</Label><Select value={adminAreaId || "none"} onValueChange={(value) => onChange({ admin_area_id: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder={kenya ? "Select county" : "Select region"} /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{kenya ? KENYA_COUNTIES.map((county) => <SelectItem key={county} value={county}>{county}</SelectItem>) : <SelectItem value="unavailable" disabled>Reference regions pending</SelectItem>}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">{kenya ? "Kenya county reference" : "Country-specific subdivision reference"}</p></div>
      <div><Label>Transport mode</Label><Select value={transportMode || "unknown"} onValueChange={(value) => onChange({ transport_mode: value === "unknown" ? "" : value })}><SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger><SelectContent><SelectItem value="unknown">Not specified</SelectItem>{TRANSPORT_MODES.map((mode) => <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>)}</SelectContent></Select></div>
      {showIncidentType ? <div className="sm:col-span-2"><Label>Mode-specific incident type</Label><Select value={incidentType || "unknown"} onValueChange={(value) => onChange({ incident_type: value === "unknown" ? "" : value })}><SelectTrigger><SelectValue placeholder="Unknown / not specified" /></SelectTrigger><SelectContent><SelectItem value="unknown">Unknown / not specified</SelectItem>{incidentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div> : null}
      <TransportEntitySelector mode={transportMode} value={transportEntityId} onChange={(id) => onChange({ transport_entity_id: id ?? "" })} />
    </div>
  </section>;
}
