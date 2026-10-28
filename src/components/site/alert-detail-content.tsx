import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function AlertSummary({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Alert summary"
      className="mt-6 rounded-xl border border-border/80 bg-muted/45 px-4 py-4 shadow-sm sm:px-5 sm:py-5"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">Summary</p>
      <div className="mt-2 text-base leading-7 text-foreground sm:text-lg sm:leading-8">
        {children}
      </div>
    </section>
  );
}

export function AlertDescriptionDisclosure({ children }: { children: ReactNode }) {
  return (
    <details open className="group mt-5 overflow-hidden rounded-xl border border-blue-200/80 bg-blue-50 dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-bold text-brand-navy outline-none transition-colors hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:text-slate-100 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
        <span>Full alert description</span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-blue-200/80 px-4 py-4 text-base leading-7 text-brand-navy/90 dark:border-slate-700 dark:text-slate-100 sm:px-5 sm:py-5">
        {children}
      </div>
    </details>
  );
}
