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
      className={`mt-6 w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm ${className}`.trim()}
      aria-label="Admin content listing"
      data-admin-listing="true"
    >
      {children}
    </section>
  );
}

export function AdminListingHeader({ children }: { children: ReactNode }) {
  return (
    <div role="row" className="hidden grid-cols-[auto_72px_minmax(18rem,2fr)_minmax(8rem,1fr)_minmax(7rem,auto)_auto] items-center gap-3 border-b border-border bg-muted/45 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground lg:grid">
      <span aria-hidden="true" />
      {children}
    </div>
  );
}

export function AdminListingRow({ children }: { children: ReactNode }) {
  return <div className="border-b border-border/70 px-4 py-3 last:border-b-0 odd:bg-background even:bg-muted/[0.18]">{children}</div>;
}
