import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { AdRichText } from "@/components/site/ad-interleave";
import { campaignStatus } from "@/lib/campaigns";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/site/share-buttons";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { PublicBreadcrumbStrip, PublicSidebar, SidebarModule } from "@/components/site/public-layout";

export const Route = createFileRoute("/campaigns/$slug")({
  head: () => ({
    meta: [
      { title: "Campaign: Share Barabara" },
      { name: "description", content: "Read about this Share Barabara campaign." },
    ],
  }),
  component: CampaignDetail,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ongoing: "default",
  upcoming: "secondary",
  previous: "outline",
};

function CampaignDetail() {
  const { slug } = Route.useParams();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading campaign…</p>;
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-[1.155rem] font-bold">Campaign not found</h1>
        <Link to="/campaigns" className="mt-4 inline-block underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const status = campaignStatus(campaign.start_date, campaign.end_date);
  const isPast = status === "previous";
  const heroImage = (isPast && campaign.report_image_url) || campaign.image_url;

  return (
    <>
      <PublicBreadcrumbStrip items={[{ label: "Home", to: "/" }, { label: "Campaigns", to: "/campaigns" }, { label: campaign.title }]} />
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:py-8">
        <article className="min-w-0 rounded-xl border border-border bg-card p-5 card-elevated sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[status]} className="capitalize">
          {status}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Megaphone className="size-4" />
          {longDate(campaign.start_date)} – {longDate(campaign.end_date)}
        </span>
        {campaign.location ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {campaign.location}
          </span>
        ) : null}
      </div>

      <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">{campaign.title}</h1>

      <div className="mt-3">
        <ShareButtons title={campaign.title} />
      </div>

      {heroImage ? (
        <img
          src={heroImage}
          alt={campaign.title}
          className="mt-4 aspect-video w-full rounded-lg border border-border object-cover"
        />
      ) : null}

      <p className="mt-6 border-l-4 border-accent pl-4 text-lg text-foreground/90">
        {campaign.description}
      </p>

      <AttachmentGallery attachments={(campaign.attachments as AttachmentRow[] | null) ?? []} />

      {isPast ? (
        campaign.report_content ? (
          <>
            <div className="mt-8 border-t border-border pt-6 text-foreground/90">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                What happened
              </h2>
              <div className="mt-4 space-y-4"><AdRichText content={campaign.report_content} placement="campaign-report-body" /></div>
            </div>
            <AttachmentGallery
              attachments={(campaign.report_attachments as AttachmentRow[] | null) ?? []}
            />
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            The write-up for this campaign is coming soon.
          </p>
        )
      ) : null}
        </article>
        <PublicSidebar>
          <SidebarModule className="border-brand-blue/50 bg-gradient-to-br from-brand-navy via-brand-blue to-primary text-primary-foreground">
            <h2 className="text-center text-lg font-bold text-white">Stay informed</h2>
            <p className="mt-2 text-center text-sm text-white/75">Get campaign updates and road safety stories.</p>
            <NewsletterForm className="mt-4" variant="sidebar" />
          </SidebarModule>
        </PublicSidebar>
      </div>
    </>
  );
}
