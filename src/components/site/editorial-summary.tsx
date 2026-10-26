import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type EditorialSummaryProps = {
  children: ReactNode;
  className?: string;
};

export function EditorialSummary({ children, className = "" }: EditorialSummaryProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-sky-200/80 bg-sky-50 px-4 py-3 pl-7 text-base leading-7 text-brand-navy/85 sm:px-5 sm:py-4 sm:pl-8 sm:text-lg sm:leading-8 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[10px] bg-[repeating-linear-gradient(135deg,var(--color-accent)_0_7px,var(--color-brand-navy)_7px_14px)]"
      />
      {children}
    </div>
  );
}

export function ReadAlso({ related }: { related: { slug: string; title: string } }) {
  return (
    <aside className="my-5 border-l-4 border-brand-navy pl-4 text-left sm:pl-5" aria-label="Read also">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-navy">Read also</p>
      <Link
        to="/news/$slug"
        params={{ slug: related.slug }}
        className="mt-1 block text-base font-bold leading-6 text-brand-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
      >
        {related.title}
      </Link>
    </aside>
  );
}
