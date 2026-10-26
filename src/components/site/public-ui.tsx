import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NewsletterForm } from "@/components/site/newsletter-form";

export const publicCategoryBadgeClass =
  "inline-flex max-w-full items-center rounded-md border border-blue-100/30 bg-brand-blue px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur transition-colors hover:border-accent hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const publicCategoryBadgeSelectedClass =
  "inline-flex max-w-full items-center rounded-md border border-blue-100/40 bg-brand-navy px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur transition-colors hover:border-accent hover:bg-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Compact yellow/navy category marker used above public detail titles. */
export const publicEditorialCategoryBadgeClass =
  "inline-flex max-w-full items-center rounded-md border border-brand-navy bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-navy transition-colors hover:bg-accent/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:px-2.5 sm:py-1 sm:text-xs";

export function PublicEditorialCategoryBadge({ children }: { children: ReactNode }) {
  return <span className={publicEditorialCategoryBadgeClass}>{children}</span>;
}

/** Compact yellow/navy controls used only by public category/filter navigation. */
export const publicCategoryNavigationClass =
  "inline-flex min-h-9 shrink-0 items-center rounded-full border border-brand-navy bg-accent px-2.5 py-1 text-xs font-bold text-brand-navy transition-colors hover:bg-accent/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:px-3 sm:py-1.5";

export const publicCategoryNavigationSelectedClass =
  "inline-flex min-h-9 shrink-0 items-center rounded-full border border-brand-navy bg-brand-navy px-2.5 py-1 text-xs font-bold text-primary-foreground transition-colors hover:bg-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:px-3 sm:py-1.5";

export function PublicCategoryBadge({ category }: { category: string }) {
  return (
    <Link to="/news" search={{ category }} className={publicCategoryBadgeClass}>
      {category}
    </Link>
  );
}

export function PublicNewsletterCard({
  className = "",
  title = "Stay informed",
  description = "Road-safety stories, alerts and community updates in your inbox.",
  children,
}: {
  className?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-300 via-amber-200 to-orange-100 p-5 text-slate-950 shadow-sm ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
        Share Barabara newsletter
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-800/80">{description}</p>
      {children ?? <NewsletterForm className="mt-4" variant="gold" />}
    </section>
  );
}

export function PublicContentContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`public-content-container ${className}`}>{children}</div>;
}

export function PublicSidebar({ children }: { children: ReactNode }) {
  return <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">{children}</aside>;
}

export function PublicSidebarSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}
