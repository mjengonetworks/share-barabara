import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Construction,
  HandHeart,
  Handshake,
  MapPin,
  Megaphone,
  PhoneCall,
  Route as RouteIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { campaignStatus } from "@/lib/campaigns";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FeaturedPageCard, FeaturedProfileCard } from "@/components/site/featured-cards";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns: Share Barabara" },
      {
        name: "description",
        content:
          "Share Barabara's road safety campaigns, emergency numbers, upcoming events and how to support the platform.",
      },
    ],
  }),
  component: CampaignsPage,
});

type CampaignCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
};

function CampaignListItem({
  campaign: c,
  dateLabel,
}: {
  campaign: CampaignCard;
  dateLabel: string;
}) {
  return (
    <Link
      to="/campaigns/$slug"
      params={{ slug: c.slug }}
      className="group flex gap-4 overflow-hidden rounded-lg border border-border bg-card p-4 transition-colors card-elevated hover:border-accent"
    >
      {c.image_url ? (
        <img
          src={c.image_url}
          alt={c.title}
          className="aspect-video w-28 shrink-0 rounded object-cover sm:w-36"
        />
      ) : null}
      <div className="min-w-0">
        <p className="font-bold text-brand-blue group-hover:underline">{c.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dateLabel}
          {c.location ? ` · ${c.location}` : ""}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
      </div>
    </Link>
  );
}

function CampaignSection({
  title,
  icon: Icon,
  campaigns,
  dateLabel,
  emptyText,
}: {
  title: string;
  icon: typeof Megaphone;
  campaigns: CampaignCard[];
  dateLabel: (c: CampaignCard) => string;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (campaigns.length === 0 && !emptyText) return null;
  const shown = expanded ? campaigns : campaigns.slice(0, 3);

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6 card-elevated">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Icon className="size-5 text-accent" /> {title}
      </h2>
      {campaigns.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {shown.map((c) => (
              <CampaignListItem key={c.id} campaign={c} dateLabel={dateLabel(c)} />
            ))}
          </div>
          {!expanded && campaigns.length > 3 ? (
            <button
              onClick={() => setExpanded(true)}
              className="mt-4 text-sm font-semibold text-brand-blue underline"
            >
              View more
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function CampaignsPage() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const ongoing = campaigns.filter((c) => campaignStatus(c.start_date, c.end_date) === "ongoing");
  const upcoming = campaigns.filter((c) => campaignStatus(c.start_date, c.end_date) === "upcoming");
  const previous = campaigns
    .filter((c) => campaignStatus(c.start_date, c.end_date) === "previous")
    .sort((a, b) => b.end_date.localeCompare(a.end_date));

  const { data: issues = [] } = useQuery({
    queryKey: ["campaigns-infra-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("id, title, road_name, county, summary, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Campaigns
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Share Barabara</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Our road safety campaigns, and how to get involved or support them.
      </p>

      <section className="mt-10 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <RouteIcon className="size-5 text-accent" /> Share Barabara: share the road
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our main, continuous campaign: a call for every road user, whether behind the wheel, on
          two wheels or on foot, to share the road with care.
        </p>
      </section>

      <CampaignSection
        title="Ongoing campaigns"
        icon={Megaphone}
        campaigns={ongoing}
        dateLabel={(c) => `Until ${longDate(c.end_date)}`}
      />

      <CampaignSection
        title="Upcoming activities"
        icon={Megaphone}
        campaigns={upcoming}
        dateLabel={(c) => `${longDate(c.start_date)} – ${longDate(c.end_date)}`}
        emptyText="The Share Barabara Walk, hospital visits to road crash victims, and county safety drives are being planned. Check back here for dates, or follow us on social media for announcements."
      />

      <CampaignSection
        title="Previous campaigns"
        icon={Megaphone}
        campaigns={previous}
        dateLabel={(c) => `${longDate(c.start_date)} – ${longDate(c.end_date)}`}
      />

      <section className="mt-6 rounded-lg border border-border bg-card p-6 card-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Construction className="size-5 text-accent" /> Infrastructure issues
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/infrastructure-issues">Report an issue</Link>
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Road, bridge, drainage and signage problems reported by the community and compiled for the
          responsible authority.
        </p>
        {issues.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No issues reported yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {issues.map((i) => (
              <li key={i.id} className="rounded border border-border p-3">
                <Link
                  to="/infrastructure-issues/$issueId"
                  params={{ issueId: i.id }}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  {i.title}
                </Link>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> {i.road_name}
                  {i.county ? ` · ${i.county}` : ""} · {longDate(i.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/infrastructure-issues"
          className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
        >
          Read more
        </Link>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <FeaturedProfileCard slot="campaigns_profile_of_day" />
        <FeaturedPageCard slot="campaigns_page_of_day" />
      </section>

      <section id="emergency" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-2">
        <div className="rounded-lg asphalt p-8 text-secondary">
          <h2 className="text-2xl font-bold text-background">At a crash scene</h2>
          <ol className="mt-4 space-y-3 text-sm text-secondary/80">
            <li>1. Stop safely, switch on hazard lights and place a warning triangle well back.</li>
            <li>2. Call 999 or 112. Give the road name, direction and nearest landmark.</li>
            <li>3. Do not move seriously injured people unless there is fire or fuel risk.</li>
            <li>4. Control bleeding with firm pressure and keep the casualty warm and talking.</li>
            <li>5. Photograph the scene and vehicle registrations before anything is moved.</li>
            <li>6. Report the crash here so other road users know to avoid the stretch.</li>
          </ol>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 card-elevated">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <PhoneCall className="size-5 text-accent" /> Emergency numbers
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-3">
                <span className="text-sm">{c.name}</span>
                <span className="font-display text-lg font-bold">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <FeaturedProfileCard slot="campaigns_profile_of_week" />
        <FeaturedPageCard slot="campaigns_page_of_week" />
      </section>

      <section className="mt-14 border-t border-border pt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <HandHeart className="size-5 text-accent" /> Support &amp; partner with Share Barabara
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Donations fund campaigns like the Share Barabara Walk and hospital visits to crash
          victims. Partnering with us includes involvement in these campaigns too.
        </p>
        <div id="donate" className="mt-4 grid scroll-mt-24 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-bold">M-Pesa</p>
            <p className="mt-1 text-lg font-semibold text-accent-foreground">0701 951 682</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-bold">PayPal</p>
            <p className="mt-1 text-lg font-semibold text-accent-foreground">phmuok@gmail.com</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">More payment options are coming soon.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <a href="#donate">
              <HandHeart className="mr-1.5 size-4" /> Support Share Barabara
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/partner-with-us">
              <Handshake className="mr-1.5 size-4" /> Partner with Share Barabara
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
