import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { renderRichText } from "@/lib/richtext";
import { campaignStatus } from "@/lib/campaigns";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/site/share-buttons";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";
import { EditorialSidebar } from "@/components/site/editorial-sidebar";
import {
  PublicBreadcrumbStrip,
} from "@/components/site/public-layout";
import { socialHead } from "@/lib/seo";
import { CampaignPreviewCard } from "@/components/site/discovery-sections";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";

export const Route = createFileRoute("/campaigns/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("campaigns").select("*").eq("slug", params.slug).maybeSingle();
    return data;
  },
  head: ({ loaderData }) => socialHead({
    title: loaderData?.title || "Share Barabara Campaign",
    description: loaderData?.description || "Read about this Share Barabara campaign.",
    pathname: `/campaigns/${loaderData?.slug ?? ""}`,
    imageUrl: loaderData?.image_url || loaderData?.report_image_url,
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
  const loaderData = Route.useLoaderData();

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
    initialData: loaderData,
  });

  const { data: relatedCampaigns = [] } = useQuery({
    queryKey: ["campaign-related", campaign?.id],
    enabled: !!campaign?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, slug, title, description, image_url, start_date, end_date")
        .neq("id", campaign!.id)
        .order("start_date", { ascending: false })
        .limit(4);
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
      <PublicBreadcrumbStrip
        items={[
          { label: "Home", to: "/" },
          { label: "Campaigns", to: "/campaigns" },
          { label: campaign.title },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-2 py-3 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:py-8">
        <article className="min-w-0 rounded-xl border border-border bg-card p-3 card-elevated sm:rounded-2xl sm:p-6">
          <Link to="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All campaigns</Link>
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

          <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">
            {campaign.title}
          </h1>

          <div className="mt-3">
            <ShareButtons title={campaign.title} />
          </div>

          {heroImage ? (
            <figure className="mt-4">
              <img src={heroImage} alt={campaign.title} className="max-h-[70vh] w-full rounded-xl border border-border bg-muted/20 object-contain" />
              {campaign.image_caption || campaign.image_credit ? <figcaption className="mt-2 text-xs text-muted-foreground">{campaign.image_caption}{campaign.image_caption && campaign.image_credit ? " · " : ""}{campaign.image_credit ? <em>Credit: {campaign.image_credit}</em> : null}</figcaption> : null}
            </figure>
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
                  <div className="mt-4 space-y-4">{renderRichText(campaign.report_content)}</div>
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
        <EditorialSidebar adPlacement="campaign-sidebar">
          {relatedCampaigns.length > 0 ? <section className="rounded-lg border border-border bg-card p-5 card-elevated"><h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Related campaigns</h2><div className="mt-3 grid gap-3">{relatedCampaigns.map((item) => <CampaignPreviewCard key={item.id} campaign={item} />)}</div><Link to="/campaigns" className="mt-4 inline-flex text-sm font-semibold text-brand-blue underline">View more campaigns</Link></section> : null}
        </EditorialSidebar>
      </div>
      <GlobalEditorialPreview destination="campaigns" excludeId={campaign.id} />
    </>
  );
}
