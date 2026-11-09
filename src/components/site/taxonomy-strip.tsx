import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export type TaxonomyStripItem = {
  key: string;
  label: string;
  to: string;
  search?: Record<string, string>;
};

export function TaxonomyStrip({
  heading,
  items,
  icon,
}: {
  heading: string;
  items: TaxonomyStripItem[];
  icon?: ReactNode;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-5 min-w-0" aria-label={heading}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-brand-navy">
        {icon}
        {heading}
      </h3>
      <div className="relative mt-2 min-w-0">
        <div
          className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-2 pr-2 [scrollbar-width:thin]"
          role="list"
          tabIndex={0}
          aria-label={`${heading} options`}
        >
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to as never}
              {...(item.search ? { search: item.search } : {})}
              role="listitem"
              className="shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
