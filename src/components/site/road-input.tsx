import { useState } from "react";
import { useRoadSuggestions } from "@/hooks/useRoadSuggestions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RoadInput({
  value,
  onChange,
  onSelect,
  id = "road",
  label = "Road or landmark",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (road: { id: string; name: string; slug: string; county?: string | null }) => void;
  id?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: suggestions = [] } = useRoadSuggestions(value);

  return (
    <div className="relative">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="e.g. A104 near Salgaa"
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full rounded border border-border bg-card shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s.name);
                  onSelect?.(s);
                  setOpen(false);
                }}
              >
                <span>{s.name}</span>{s.county ? <span className="ml-2 text-xs text-muted-foreground">{s.county}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
