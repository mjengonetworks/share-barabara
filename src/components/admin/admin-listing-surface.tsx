import type { ReactNode } from "react";

export function AdminListingSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-6 w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm ${className}`.trim()}>
      {children}
    </section>
  );
}

export function AdminListingHeader({ children }: { children: ReactNode }) {
  return (
    <div className="hidden min-w-0 grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(7rem,auto)_minmax(8rem,auto)_auto] items-center gap-3 border-b border-border bg-muted/45 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground lg:grid">
      {children}
    </div>
  );
}

export function AdminListingRow({ children }: { children: ReactNode }) {
  return <div className="min-w-0 border-b border-border/70 px-4 py-3 last:border-b-0 odd:bg-background even:bg-muted/[0.18]">{children}</div>;
}

export function AdminListingThumbnail({ src, alt, fallback }: { src?: string | null; alt: string; fallback: ReactNode }) {
  return src ? (
    <img src={src} alt={alt} className="size-12 shrink-0 rounded-md bg-muted object-cover" />
  ) : (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" role="img" aria-label={alt || "No featured image"}>
      {fallback}
    </div>
  );
}
