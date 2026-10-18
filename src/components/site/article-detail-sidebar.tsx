import { Link } from "@tanstack/react-router";
import { Flame, Newspaper } from "lucide-react";
import { BannerAd } from "@/components/site/banner-ad";
import {
  PublicNewsletterCard,
  PublicSidebar,
  PublicSidebarSection,
} from "@/components/site/public-ui";
import {
  AlertPreviewCard,
  ReportPreviewCard,
  SisterPlatformPreviews,
} from "@/components/site/discovery-sections";

export type ArticleSidebarArticle = {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  image_url?: string | null;
  source?: string | null;
};

type ArticleSidebarProps = {
  related: ArticleSidebarArticle[];
  latest: ArticleSidebarArticle[];
  trending: ArticleSidebarArticle[];
  categories: string[];
  contextualReports: Array<Record<string, unknown>>;
  contextualAlerts: Array<Record<string, unknown>>;
};

export function ArticleSidebarList({ articles }: { articles: ArticleSidebarArticle[] }) {
  if (!articles.length) return null;

  return (
    <div className="mt-4 divide-y divide-border/70">
      {articles.map((article) => (
        <Link
          key={article.id}
          to="/news/$slug"
          params={{ slug: article.slug }}
          className="group flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1 py-0.5">
            <span className="block line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-brand-blue group-hover:underline">
              {article.title}
            </span>
            <span className="mt-1 block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-accent-foreground">
              {article.category ?? "News"}
              {article.source ? ` · ${article.source}` : ""}
            </span>
          </span>
          <span className="order-2 w-[38%] shrink-0 overflow-hidden rounded-md bg-muted">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt=""
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center">
                <Newspaper className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ArticleSidebar({
  related,
  latest,
  trending,
  categories,
  contextualReports,
  contextualAlerts,
}: ArticleSidebarProps) {
  const hasRoadContext = contextualReports.length > 0 || contextualAlerts.length > 0;

  return (
    <PublicSidebar>
      <PublicNewsletterCard />

      {related.length > 0 ? (
        <PublicSidebarSection>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Related articles
          </h2>
          <ArticleSidebarList articles={related} />
          <Link
            to="/news"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
          >
            Read more
          </Link>
        </PublicSidebarSection>
      ) : null}

      {latest.length > 0 ? (
        <PublicSidebarSection>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Latest articles
          </h2>
          <ArticleSidebarList articles={latest} />
          <Link
            to="/news"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
          >
            Read more
          </Link>
        </PublicSidebarSection>
      ) : null}

      {categories.length > 0 ? (
        <PublicSidebarSection>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Browse articles by category
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                to="/news"
                search={{ category }}
                className="inline-flex items-center rounded-md border border-white/20 bg-brand-navy/90 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur transition-colors hover:border-accent hover:bg-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {category}
              </Link>
            ))}
          </div>
        </PublicSidebarSection>
      ) : null}

      {trending.length > 0 ? (
        <PublicSidebarSection>
          <h2 className="flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Flame className="size-4 text-accent" aria-hidden="true" /> Trending articles
          </h2>
          <ArticleSidebarList articles={trending} />
          <Link
            to="/news"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
          >
            Read more
          </Link>
        </PublicSidebarSection>
      ) : null}

      {hasRoadContext ? (
        <PublicSidebarSection>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Road safety context
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Public reports and active alerts connected to this story.
          </p>
          <div className="mt-4 space-y-4">
            {contextualReports.slice(0, 2).map((report) => (
              <div key={String(report.id)}>
                <ReportPreviewCard report={report as never} />
              </div>
            ))}
            {contextualAlerts.slice(0, 2).map((alert) => (
              <div key={String(alert.id)}>
                <AlertPreviewCard alert={alert as never} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-brand-blue">
            {contextualReports.length > 0 ? (
              <Link to="/reports" className="underline">
                View reports
              </Link>
            ) : null}
            {contextualAlerts.length > 0 ? (
              <Link to="/alerts" className="underline">
                View alerts
              </Link>
            ) : null}
          </div>
        </PublicSidebarSection>
      ) : null}

      <PublicSidebarSection>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Our ecosystem
        </h2>
        <div className="mt-4">
          <SisterPlatformPreviews />
        </div>
      </PublicSidebarSection>

      <BannerAd placement="article-sidebar" />
    </PublicSidebar>
  );
}
