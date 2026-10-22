import type { ReactNode } from "react";
import { BannerAd } from "@/components/site/banner-ad";
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
  return (
    <PublicSidebar>
      <PublicNewsletterCard />
      {children}
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
