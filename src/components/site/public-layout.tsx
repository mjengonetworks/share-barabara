import type { ReactNode } from "react";
import { ArrowRight, MapPin, Newspaper } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { longDateWithDay } from "@/lib/format";
import { SeverityBadge } from "@/components/site/severity-badge";
import { displayReportCount } from "@/lib/report-metrics";

export type PublicArticleCard = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  source?: string | null;
  published_at?: string | null;
  featured?: boolean | null;
  image_url?: string | null;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  to,
  actionLabel = "View all",
  icon,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  to?: "/news" | "/alerts" | "/reports";
  actionLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          {icon}
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
        >
          {actionLabel} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function ArticleImage({ article, lead = false }: { article: PublicArticleCard; lead?: boolean }) {
  return article.image_url ? (
    <img
      src={article.image_url}
      alt={article.title}
      loading={lead ? "eager" : "lazy"}
      className={cn("w-full object-cover object-center", lead ? "aspect-[16/9]" : "aspect-video")}
    />
  ) : (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-primary/5 text-primary/50",
        lead ? "aspect-[16/9]" : "aspect-video",
      )}
      aria-label="Article image unavailable"
    >
      <Newspaper className={lead ? "size-10" : "size-8"} aria-hidden="true" />
    </div>
  );
}

function ArticleMeta({
  article,
  compact = false,
}: {
  article: PublicArticleCard;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      {article.category ? (
        <span
          className={cn(
            "rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-brand-navy",
            compact && "px-1.5",
          )}
        >
          {article.category}
        </span>
      ) : null}
      {!compact && article.featured ? (
        <span className="font-semibold text-caution">Featured</span>
      ) : null}
      {!compact && article.source ? <span>· {article.source}</span> : null}
    </div>
  );
}

export function FeaturedLeadCard({ article }: { article: PublicArticleCard }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: article.slug }}
      className="group block overflow-hidden rounded-xl border border-border bg-card card-elevated transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArticleImage article={article} lead />
      <div className="p-5 sm:p-6">
        <ArticleMeta article={article} />
        <h3 className="mt-3 text-2xl font-extrabold leading-tight text-brand-navy group-hover:underline sm:text-3xl">
          {article.title}
        </h3>
        {article.summary ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {article.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function CompactArticleCard({ article }: { article: PublicArticleCard }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: article.slug }}
      className="group flex min-w-0 gap-3 rounded-lg border border-border bg-card p-3 transition-colors card-elevated hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block sm:overflow-hidden sm:p-0"
    >
      <div className="w-28 shrink-0 sm:w-full">
        <ArticleImage article={article} />
      </div>
      <div className="min-w-0 sm:p-4">
        <ArticleMeta article={article} />
        <h3 className="mt-1.5 line-clamp-3 font-bold leading-snug text-brand-navy group-hover:underline sm:text-base">
          {article.title}
        </h3>
        {article.summary ? (
          <p className="mt-2 hidden line-clamp-2 text-sm text-muted-foreground sm:block">
            {article.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function CompactArticleRow({ article }: { article: PublicArticleCard }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: article.slug }}
      className="group flex min-w-0 gap-3 border-b border-border/70 py-3 first:pt-0 last:border-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="w-[38%] shrink-0 overflow-hidden rounded-md bg-muted">
        <ArticleImage article={article} />
      </div>
      <div className="min-w-0 py-0.5">
        <ArticleMeta article={article} compact />
        <h3 className="mt-1 line-clamp-3 text-[13px] font-bold leading-snug text-brand-navy group-hover:underline sm:text-sm">
          {article.title}
        </h3>
      </div>
    </Link>
  );
}

export function EditorialLeadAndRows({
  articles,
  placement,
  renderAd,
}: {
  articles: PublicArticleCard[];
  placement?: string;
  renderAd?: (slot: number) => ReactNode;
}) {
  const [lead, ...rows] = articles;
  if (!lead) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
      <FeaturedLeadCard article={lead} />
      <div className="space-y-4">
        {rows.slice(0, 4).map((article) => (
          <CompactArticleRow key={article.id} article={article} />
        ))}
        {renderAd && rows.length >= 4 ? renderAd(1) : null}
      </div>
      {placement ? <span className="sr-only">{placement}</span> : null}
    </div>
  );
}

/** Editorial lead plus image-led compact cards for dense three-column newsroom sections. */
export function EditorialLeadAndCompactCards({
  articles,
  placement,
}: {
  articles: PublicArticleCard[];
  placement?: string;
}) {
  const [lead, ...secondary] = articles;
  if (!lead) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,0.82fr))]">
      <FeaturedLeadCard article={lead} />
      {secondary.slice(0, 4).map((article) => (
        <CompactArticleCard key={article.id} article={article} />
      ))}
      {placement ? <span className="sr-only">{placement}</span> : null}
    </div>
  );
}

export function CompactEditorialColumn({
  title,
  articles,
  to = "/news",
  placement,
}: {
  title: string;
  articles: PublicArticleCard[];
  to?: "/news" | "/alerts" | "/reports";
  placement?: string;
}) {
  const [lead, ...supporting] = articles;
  if (!lead) return null;

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-brand-blue">
          {title}
        </h3>
        {placement ? <span className="sr-only">{placement}</span> : null}
      </div>
      <Link
        to="/news/$slug"
        params={{ slug: lead.slug }}
        className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArticleImage article={lead} lead />
        <ArticleMeta article={lead} compact />
        <h4 className="mt-2 line-clamp-3 text-base font-bold leading-tight text-brand-navy group-hover:underline">
          {lead.title}
        </h4>
      </Link>
      {supporting.length ? (
        <div className="mt-3 border-t border-border/70">
          {supporting.slice(0, 3).map((article) => (
            <CompactArticleRow key={article.id} article={article} />
          ))}
        </div>
      ) : null}
      <Link
        to={to}
        className="mt-auto inline-flex items-center pt-4 text-xs font-bold text-brand-blue underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View more <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function CompactEditorialColumns({
  articles,
  titles,
  placement,
  to = "/news",
}: {
  articles: PublicArticleCard[];
  titles?: string[];
  placement?: string;
  to?: "/news" | "/alerts" | "/reports";
}) {
  if (!articles.length) return null;
  const uniqueArticles = articles
    .filter(
      (article, index, all) =>
        all.findIndex(
          (candidate) => candidate.id === article.id || candidate.slug === article.slug,
        ) === index,
    )
    .slice(0, 12);
  const columnCount = Math.min(3, uniqueArticles.length);
  const columns: PublicArticleCard[][] = Array.from({ length: columnCount }, () => []);
  uniqueArticles.forEach((article, index) => columns[index % columnCount].push(article));

  return (
    <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {columns.map((column, index) => (
        <CompactEditorialColumn
          key={`${placement ?? "editorial"}-${index}`}
          title={titles?.[index] ?? `Stories ${index + 1}`}
          articles={column}
          placement={placement}
          to={to}
        />
      ))}
    </div>
  );
}

export function EditorialCardSection({ articles }: { articles: PublicArticleCard[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.slice(0, 6).map((article) => (
        <CompactArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

export function LocationMeta({ county, road }: { county?: string | null; road?: string | null }) {
  if (!county && !road) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <MapPin className="size-3.5" aria-hidden="true" />
      {[road, county].filter(Boolean).join(" · ")}
    </p>
  );
}

export function ArticleCardGrid({ articles }: { articles: PublicArticleCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <CompactArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

export function EditorialBand({
  children,
  tone = "plain",
  className,
}: {
  children: ReactNode;
  tone?: "plain" | "pale";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "-mx-4 px-4 py-10 sm:-mx-8 sm:px-8 sm:py-12",
        tone === "pale" ? "bg-primary/[0.045]" : "bg-background",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PublicSidebar({ children }: { children: ReactNode }) {
  return (
    <aside
      className="space-y-6 lg:sticky lg:top-24 lg:self-start"
      aria-label="Related content and newsletter"
    >
      {children}
    </aside>
  );
}

export function SidebarModule({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 card-elevated", className)}>
      {children}
    </div>
  );
}

export type PublicBreadcrumbItem = { label: string; to?: string };

/** Shared breadcrumb strip for every public detail surface. */
export function PublicBreadcrumbStrip({ items }: { items: PublicBreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full bg-gradient-to-r from-brand-navy via-brand-blue to-primary text-primary-foreground"
    >
      <div className="mx-auto flex min-h-[38px] max-w-[1500px] items-center gap-1 overflow-hidden px-4 py-2 text-xs sm:px-6">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index ? <span className="shrink-0 text-primary-foreground/60">›</span> : null}
            {item.to ? (
              <Link to={item.to as never} className="shrink-0 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-primary-foreground/85">{item.label}</span>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}

/** The approved 70/30 shell keeps all public detail pages aligned. */
export function PublicDetailShell({
  breadcrumb,
  children,
  sidebar,
}: {
  breadcrumb: PublicBreadcrumbItem[];
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <>
      <PublicBreadcrumbStrip items={breadcrumb} />
      <div className="mx-auto grid w-full max-w-[1500px] items-start gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:py-6">
        <article className="min-w-0 rounded-xl border border-border bg-card p-5 card-elevated sm:p-6">
          {children}
        </article>
        {sidebar ? <PublicSidebar>{sidebar}</PublicSidebar> : null}
      </div>
    </>
  );
}

export function DetailSidebarList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/70">{children}</div>;
}

export function CategoryChip({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
        active
          ? "border-brand-blue bg-brand-blue text-white"
          : "border-[#CFE2FA] bg-[#EAF3FF] text-[#174A87]",
      )}
    >
      {children}
    </span>
  );
}

export type PublicIncidentCard = {
  id: string;
  title: string;
  severity?: string | null;
  county?: string | null;
  road?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  description?: string | null;
  hazard_type?: string | null;
  incident_type?: string | null;
  status?: string | null;
  vehicles_involved?: number | null;
  casualties?: number | null;
  fatalities?: number | null;
};

function IncidentImage({ item, lead = false }: { item: PublicIncidentCard; lead?: boolean }) {
  return item.image_url ? (
    <img
      src={item.image_url}
      alt={item.title}
      loading={lead ? "eager" : "lazy"}
      className={cn("w-full rounded-md object-cover", lead ? "aspect-video" : "aspect-[4/3]")}
    />
  ) : null;
}

function IncidentRow({
  item,
  kind,
  actions,
}: {
  item: PublicIncidentCard;
  kind: "alert" | "report";
  actions?: (item: PublicIncidentCard) => ReactNode;
}) {
  const to = kind === "alert" ? "/alerts/$alertId" : "/reports/$reportId";
  const params = kind === "alert" ? { alertId: item.id } : { reportId: item.id };
  return (
    <Link
      to={to as never}
      params={params as never}
      className="group flex min-w-0 gap-3 border-b border-border/70 py-3 first:pt-0 last:border-0 last:pb-0"
    >
      {item.image_url ? (
        <div className="w-[38%] shrink-0 overflow-hidden rounded-md bg-muted">
          <IncidentImage item={item} />
        </div>
      ) : null}
      <div className="min-w-0 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.severity ? <SeverityBadge value={item.severity} /> : null}
          {kind === "alert" ? (
            <span className="text-[11px] text-muted-foreground">
              {longDateWithDay(item.occurred_at ?? item.created_at ?? "")}
            </span>
          ) : null}
        </div>
        <h4 className="mt-1 line-clamp-3 text-[13px] font-bold leading-snug text-foreground group-hover:underline sm:text-sm">
          {item.title}
        </h4>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
          {[item.county, item.road].filter(Boolean).join(" · ") || "Location not provided"}
        </p>
        {actions ? <div className="mt-2">{actions(item)}</div> : null}
      </div>
    </Link>
  );
}

export function CompactIncidentColumns({
  items,
  kind,
  titles = ["Lead reports", "On the road", "Community watch"],
  placement,
  renderActions,
}: {
  items: PublicIncidentCard[];
  kind: "alert" | "report";
  titles?: string[];
  placement?: string;
  renderActions?: (item: PublicIncidentCard) => ReactNode;
}) {
  const unique = items
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 12);
  if (!unique.length) return null;
  const columns: PublicIncidentCard[][] = Array.from(
    { length: Math.min(3, unique.length) },
    () => [],
  );
  unique.forEach((item, index) => columns[index % columns.length].push(item));
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {columns.map((column, index) => {
        const [lead, ...supporting] = column;
        const to = kind === "alert" ? "/alerts/$alertId" : "/reports/$reportId";
        const params = kind === "alert" ? { alertId: lead.id } : { reportId: lead.id };
        return (
          <section
            key={`${placement ?? kind}-${index}`}
            className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <h3 className="border-b border-border pb-3 text-sm font-extrabold uppercase tracking-[0.12em] text-brand-blue">
              {titles[index] ?? `Stories ${index + 1}`}
            </h3>
            <Link to={to as never} params={params as never} className="group mt-4 block">
              <IncidentImage item={lead} lead />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {lead.severity ? <SeverityBadge value={lead.severity} /> : null}
                {kind === "alert" ? (
                  <span className="text-[11px] text-muted-foreground">
                    {longDateWithDay(lead.occurred_at ?? lead.created_at ?? "")}
                  </span>
                ) : null}
              </div>
              <h4 className="mt-2 line-clamp-3 text-base font-bold leading-tight text-foreground group-hover:underline">
                {lead.title}
              </h4>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {[lead.county, lead.road, lead.status].filter(Boolean).join(" · ") ||
                  "Location not provided"}
              </p>
              {kind === "report" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  <strong>{displayReportCount(lead.vehicles_involved)}</strong> vehicles ·{" "}
                  <strong>{displayReportCount(lead.casualties)}</strong> injured ·{" "}
                  <strong>{displayReportCount(lead.fatalities)}</strong> deaths
                </p>
              ) : null}
              {renderActions ? <div className="mt-3">{renderActions(lead)}</div> : null}
            </Link>
            {supporting.length ? (
              <div className="mt-3 border-t border-border/70">
                {supporting.slice(0, 3).map((item) => (
                  <IncidentRow key={item.id} item={item} kind={kind} actions={renderActions} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
