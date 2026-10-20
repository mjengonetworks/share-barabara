import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Construction,
  Flame,
  Megaphone,
  Newspaper,
  Radio,
  TriangleAlert,
} from "lucide-react";
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
import {
  publicCategoryBadgeClass,
  publicRecommendationBadgeClass,
} from "@/components/site/public-ui";

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
            <span className="mt-1 block">
              <span className={publicRecommendationBadgeClass}>{article.category ?? "News"}</span>
              {article.source ? (
                <span className="ml-1 text-[0.68rem] text-muted-foreground">
                  · {article.source}
                </span>
              ) : null}
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
  const sectionPreviews = [
    {
      label: "Alerts",
      description: "Active road hazards and public safety updates.",
      to: "/alerts",
      icon: TriangleAlert,
    },
    {
      label: "Accident Reports",
      description: "Approved community reports from roads across Kenya.",
      to: "/reports",
      icon: Radio,
    },
    {
      label: "Statistics",
      description: "Explore published road safety trends and summaries.",
      to: "/statistics",
      icon: BarChart3,
    },
    {
      label: "Campaigns",
      description: "Community campaigns supporting safer roads and travel.",
      to: "/campaigns",
      icon: Megaphone,
    },
    {
      label: "Media & Feed",
      description: "Videos, community posts and timely road conversations.",
      to: "/feed",
      icon: Newspaper,
    },
    {
      label: "Infrastructure Issues",
      description: "Track public road and infrastructure concerns.",
      to: "/infrastructure-issues",
      icon: Construction,
    },
  ] as const;

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
        <>
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
                  className={publicCategoryBadgeClass}
                >
                  {category}
                </Link>
              ))}
            </div>
          </PublicSidebarSection>
          <BannerAd placement="article-sidebar-after-categories" />
        </>
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
          Explore Share Barabara
        </h2>
        <div className="mt-3 divide-y divide-border/70">
          {sectionPreviews.map(({ label, description, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold group-hover:text-brand-blue group-hover:underline">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </PublicSidebarSection>

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
