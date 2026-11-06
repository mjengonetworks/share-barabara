import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BannerAd } from "@/components/site/banner-ad";
import { getUnifiedFeed } from "@/lib/unified-feed";
import { UnifiedFeedList } from "@/components/site/unified-feed-list";
import { SisterPlatformPreviews } from "@/components/site/discovery-sections";
import {
  PublicNewsletterCard,
  PublicSidebar,
  PublicSidebarSection,
} from "@/components/site/public-ui";

/** Shared public detail sidebar. Content-specific modules are supplied by the route. */
export function EditorialSidebar({
  children,
  adPlacement = "detail-sidebar",
}: {
  children?: ReactNode;
  adPlacement?: string;
}) {
  const { data: feedItems = [] } = useQuery({
    queryKey: ["public-feed-sidebar"],
    queryFn: () => getUnifiedFeed({ limit: 3 }),
    staleTime: 30_000,
  });
  return (
    <PublicSidebar>
      <PublicNewsletterCard />
      {children}
      {feedItems.length > 0 ? (
        <PublicSidebarSection>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Latest Media &amp; Feed
          </h2>
          <UnifiedFeedList items={feedItems} />
          <a
            href="/feed"
            className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
          >
            View all
          </a>
        </PublicSidebarSection>
      ) : null}
      <PublicSidebarSection>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Explore Share Barabara
        </h2>
        <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Explore Share Barabara">
          <Link className="text-brand-blue hover:underline" to="/news">
            News &amp; Articles
          </Link>
          <Link className="text-brand-blue hover:underline" to="/alerts">
            Alerts
          </Link>
          <Link className="text-brand-blue hover:underline" to="/reports">
            Accident Reports
          </Link>
          <Link className="text-brand-blue hover:underline" to="/infrastructure-issues">
            Infrastructure Issues
          </Link>
          <Link className="text-brand-blue hover:underline" to="/campaigns">
            Campaigns
          </Link>
        </nav>
      </PublicSidebarSection>
      <PublicSidebarSection>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Share Barabara ecosystem
        </h2>
        <div className="mt-3">
          <SisterPlatformPreviews />
        </div>
      </PublicSidebarSection>
      <BannerAd placement={adPlacement} />
    </PublicSidebar>
  );
}
