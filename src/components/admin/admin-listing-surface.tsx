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
      className={`mt-4 w-full min-w-0 overflow-visible rounded-lg border border-border bg-card shadow-sm ${className}`.trim()}
      aria-label="Admin content listing"
      data-admin-listing="true"
    >
      {children}
    </section>
  );
}

export function AdminListingHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="row" data-admin-listing-header="true" className={`hidden w-full min-w-0 break-words grid-cols-[auto_40px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,auto)_40px] items-center gap-1.5 border-b border-border bg-muted/45 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid ${className}`.trim()}>
      <span aria-hidden="true" className="hidden md:block" />
      {children}
    </div>
  );
}

export function AdminListingRow({
  children,
  onActivate,
  className = "",
}: {
  children: ReactNode;
  onActivate?: () => void;
  className?: string;
}) {
  const ignoreInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest("a,button,input,select,textarea,[role='button'],[role='checkbox'],[data-row-action]"));

  return (
    <li
      role="row"
      tabIndex={onActivate ? 0 : undefined}
      data-admin-listing-row="true"
      className={`border-b border-border/70 px-2 py-2 last:border-b-0 odd:bg-background even:bg-muted/[0.18] ${onActivate ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue" : ""} ${className}`.trim()}
      onClick={(event) => {
        if (!onActivate || ignoreInteractiveTarget(event.target)) return;
        onActivate();
      }}
      onKeyDown={(event) => {
        if (!onActivate || ignoreInteractiveTarget(event.target)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      {children}
    </li>
  );
}
