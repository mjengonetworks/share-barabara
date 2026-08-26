import { Checkbox } from "@/components/ui/checkbox";

/** Multiple categories can be selected for an article; the first one picked
 *  stays the "primary" category used for routing/filtering/badges. */
export function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {categories.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(c.name)}
            onCheckedChange={(v) =>
              onChange(v === true ? [...value, c.name] : value.filter((x) => x !== c.name))
            }
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}
