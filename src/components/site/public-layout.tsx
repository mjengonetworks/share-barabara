import type { ReactNode } from "react";
import { ArrowRight, MapPin, Newspaper } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { longDateWithDay } from "@/lib/format";

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
      className={cn("w-full object-cover object-center", lead ? "aspect-[16/8]" : "aspect-video")}
    />
  ) : (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-primary/5 text-primary/50",
        lead ? "aspect-[16/8]" : "aspect-video",
      )}
      aria-label="Article image unavailable"
    >
      <Newspaper className={lead ? "size-10" : "size-8"} aria-hidden="true" />
    </div>
  );
}

function ArticleMeta({ article }: { article: PublicArticleCard }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {article.category ? (
        <span className="rounded bg-accent/20 px-2 py-0.5 font-semibold uppercase tracking-wider text-accent-foreground">
          {article.category}
        </span>
      ) : null}
      {article.featured ? <span className="font-semibold text-caution">Featured</span> : null}
      {article.published_at ? <span>{longDateWithDay(article.published_at)}</span> : null}
      {article.source ? <span>· {article.source}</span> : null}
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
        <h3 className="mt-3 text-2xl font-extrabold leading-tight text-brand-blue group-hover:underline sm:text-3xl">
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
        <h3 className="mt-1.5 line-clamp-3 font-bold leading-snug text-brand-blue group-hover:underline sm:text-base">
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
      className="group flex min-w-0 gap-3 border-b border-border/70 pb-4 last:border-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:w-32">
        <ArticleImage article={article} />
      </div>
      <div className="min-w-0 py-0.5">
        <ArticleMeta article={article} />
        <h3 className="mt-1 line-clamp-3 text-sm font-bold leading-snug text-brand-blue group-hover:underline sm:text-base">
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
