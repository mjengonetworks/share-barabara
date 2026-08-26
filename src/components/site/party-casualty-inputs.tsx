import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PARTIES_INVOLVED } from "@/lib/constants";

export type CasualtyBreakdown = Record<string, { dead?: number; injured?: number }>;

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

  return (
    <div className="mt-3 space-y-2 rounded border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Optional: if you know exact numbers, add them here for accurate statistics. Otherwise just
        describe it in the write-up below.
      </p>
      {parties.map((p) => {
        const label = PARTIES_INVOLVED.find((x) => x.value === p)?.label ?? p;
        const entry = value[p] ?? {};
        return (
          <div key={p} className="flex flex-wrap items-center gap-3">
            <span className="w-40 shrink-0 text-sm">{label}</span>
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
