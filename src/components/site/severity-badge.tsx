import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  low: "bg-safe/15 text-safe border-safe/30",
  minor: "bg-safe/15 text-safe border-safe/30",
  medium: "bg-accent/20 text-accent-foreground border-accent/40",
  moderate: "bg-accent/20 text-accent-foreground border-accent/40",
  high: "bg-caution/20 text-caution border-caution/40",
  serious: "bg-caution/20 text-caution border-caution/40",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  fatal: "bg-destructive/15 text-destructive border-destructive/30",
};

export function SeverityBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        TONE[value] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {value}
    </span>
  );
}