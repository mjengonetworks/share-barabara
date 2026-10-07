import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseNullableCount, type NullableReportCount } from "@/lib/report-metrics";

export function NullableNumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: NullableReportCount;
  onChange: (value: NullableReportCount) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value === null ? "" : value}
        placeholder="Not confirmed"
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw.trim()) {
            onChange(null);
            return;
          }
          const parsed = parseNullableCount(raw);
          if (parsed !== null) onChange(parsed);
        }}
      />
      <Button
        type="button"
        variant={value === null ? "secondary" : "ghost"}
        size="sm"
        className="h-auto px-1.5 py-0.5 text-xs"
        onClick={() => onChange(null)}
      >
        {value === null ? "Not confirmed" : "Mark unknown"}
      </Button>
    </div>
  );
}
