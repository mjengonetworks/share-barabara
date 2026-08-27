import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTIES_INVOLVED, PASSENGER_VEHICLE_TYPES, MOTORCYCLIST_SUBTYPES } from "@/lib/constants";

export type CasualtyBreakdown = Record<
  string,
  { dead?: number; injured?: number; subtype?: string }
>;

const SUBTYPE_OPTIONS: Record<string, readonly { value: string; label: string }[]> = {
  passenger: PASSENGER_VEHICLE_TYPES,
  motorcyclist: MOTORCYCLIST_SUBTYPES,
};

/** Optional per-party dead/injured counts, shown only for parties the
 *  reporter already checked as involved. Nothing here is required — anyone
 *  who'd rather just describe it in the write-up can skip this entirely. */
export function PartyCasualtyInputs({
  parties,
  value,
  onChange,
}: {
  parties: string[];
  value: CasualtyBreakdown;
  onChange: (next: CasualtyBreakdown) => void;
}) {
  if (parties.length === 0) return null;

  const set = (party: string, field: "dead" | "injured", n: number) => {
    const next = { ...value, [party]: { ...value[party], [field]: n || undefined } };
    onChange(next);
  };
  const setSubtype = (party: string, subtype: string) => {
    const entry = { ...value[party] };
    if (subtype) entry.subtype = subtype;
    else delete entry.subtype;
    onChange({ ...value, [party]: entry });
  };

  return (
    <div className="mt-3 space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Optional: if you know exact numbers, add them here for accurate statistics. Otherwise just
        describe it in the write-up below.
      </p>
      {parties.map((p) => {
        const label = PARTIES_INVOLVED.find((x) => x.value === p)?.label ?? p;
        const entry = value[p] ?? {};
        const subtypeOptions = SUBTYPE_OPTIONS[p];
        return (
          <div key={p} className="flex flex-wrap items-center gap-3">
            <span className="w-40 shrink-0 text-sm">{label}</span>
            {subtypeOptions ? (
              <Select
                value={entry.subtype ?? "unspecified"}
                onValueChange={(v) => setSubtype(p, v === "unspecified" ? "" : v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Type unspecified</SelectItem>
                  {subtypeOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="flex items-center gap-1">
              <Label htmlFor={`cas-dead-${p}`} className="text-xs text-muted-foreground">
                Dead
              </Label>
              <Input
                id={`cas-dead-${p}`}
                type="number"
                min={0}
                value={entry.dead ?? ""}
                onChange={(e) => set(p, "dead", Number(e.target.value))}
                className="h-8 w-16"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor={`cas-inj-${p}`} className="text-xs text-muted-foreground">
                Injured
              </Label>
              <Input
                id={`cas-inj-${p}`}
                type="number"
                min={0}
                value={entry.injured ?? ""}
                onChange={(e) => set(p, "injured", Number(e.target.value))}
                className="h-8 w-16"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
