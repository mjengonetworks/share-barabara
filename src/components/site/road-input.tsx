import { useId, useState } from "react";
import { useRoadSuggestions } from "@/hooks/useRoadSuggestions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RoadInput({
  value,
  onChange,
  onRoadIdChange,
  id = "road",
  label = "Road or landmark",
}: {
  value: string;
  onChange: (v: string) => void;
  onRoadIdChange?: (id: string | null) => void;
  id?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const { data: suggestions = [] } = useRoadSuggestions(value);

  function chooseSuggestion(suggestion: { id: string; name: string }) {
    onChange(suggestion.name);
    onRoadIdChange?.(suggestion.id);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onRoadIdChange?.(null);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setActiveIndex(-1); }, 150)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            chooseSuggestion(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        placeholder="e.g. A104 near Salgaa"
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute z-10 mt-1 w-full rounded border border-border bg-card shadow-lg">
          {suggestions.map((s, index) => (
            <li key={s.id} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${index === activeIndex ? "bg-muted" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(s)}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
