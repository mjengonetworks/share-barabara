import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { renderRichText } from "@/lib/richtext";
import { campaignStatus } from "@/lib/campaigns";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/site/share-buttons";

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
        <h1 className="text-2xl font-bold">Campaign not found</h1>
        <Link to="/campaigns" className="mt-4 inline-block underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const status = campaignStatus(campaign.start_date, campaign.end_date);
  const heroImage = campaign.report_image_url ?? campaign.image_url;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> All campaigns
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[status]} className="capitalize">
          {status}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Megaphone className="size-4" />
          {longDate(campaign.start_date)} – {longDate(campaign.end_date)}
        </span>
      </div>

      <h1 className="mt-3 text-4xl font-extrabold leading-tight">{campaign.title}</h1>

      <div className="mt-3">
        <ShareButtons title={campaign.title} />
      </div>

      {heroImage ? (
        <img
          src={heroImage}
          alt={campaign.title}
          className="mt-6 aspect-video w-full rounded-lg border border-border object-cover"
        />
      ) : null}

      <p className="mt-6 border-l-4 border-accent pl-4 text-lg text-foreground/90">
        {campaign.description}
      </p>

      {campaign.report_content ? (
        <div className="mt-6 space-y-4 text-foreground/90">
          {renderRichText(campaign.report_content)}
        </div>
      ) : status === "previous" ? (
        <p className="mt-6 text-sm text-muted-foreground">
          The write-up for this campaign is coming soon.
        </p>
      ) : null}
    </div>
  );
}
