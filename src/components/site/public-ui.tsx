import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NewsletterForm } from "@/components/site/newsletter-form";

export const publicCategoryBadgeClass =
  "inline-flex max-w-full items-center rounded-md border border-blue-200/25 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm shadow-brand-navy/20 backdrop-blur transition-colors hover:border-accent hover:from-brand-blue hover:to-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const publicCategoryBadgeSelectedClass =
  "inline-flex max-w-full items-center rounded-md border border-blue-200/40 bg-brand-blue px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm shadow-brand-navy/20 transition-colors hover:border-accent hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
