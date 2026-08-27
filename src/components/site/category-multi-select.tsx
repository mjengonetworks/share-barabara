import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoles } from "@/hooks/useRoles";

/** Multiple categories can be selected for an article; the first one picked
 *  stays the "primary" category used for routing/filtering/badges. Renders
 *  as a dropdown for anyone author-rank or above (a checkbox grid looked
 *  clanky); guest authors keep the plain checkbox list. */
export function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { canEditSeo } = useRoles();
  const toggle = (name: string, checked: boolean) =>
    onChange(checked ? [...value, name] : value.filter((x) => x !== name));

  if (!canEditSeo) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {categories.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(c.name)}
              onCheckedChange={(v) => toggle(c.name, v === true)}
            />
            {c.name}
          </label>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">
            {value.length === 0 ? "Select categories…" : value.join(", ")}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {categories.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={value.includes(c.name)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(v) => toggle(c.name, v)}
          >
            {c.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
