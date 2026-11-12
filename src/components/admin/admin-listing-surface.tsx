import type { ReactNode } from "react";

export function AdminListingSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mt-4 w-full min-w-0 overflow-x-auto rounded-lg border border-border bg-card shadow-sm ${className}`.trim()}
      aria-label="Admin content listing"
      data-admin-listing="true"
    >
      {children}
    </section>
  );
}

export function AdminListingHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="row" className={`grid min-w-[980px] whitespace-nowrap grid-cols-[auto_48px_minmax(10rem,2fr)_minmax(6rem,1fr)_minmax(5.5rem,1fr)_minmax(6.5rem,1fr)_minmax(4rem,auto)_minmax(6.5rem,auto)_minmax(7rem,auto)] items-center gap-2 border-b border-border bg-muted/45 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`.trim()}>
      <span aria-hidden="true" className="hidden md:block" />
      {children}
    </div>
  );
}

export function AdminListingRow({ children }: { children: ReactNode }) {
  return <div className="border-b border-border/70 px-3 py-2 last:border-b-0 odd:bg-background even:bg-muted/[0.18]">{children}</div>;
}
