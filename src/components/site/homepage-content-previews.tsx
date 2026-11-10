import { useQuery } from "@tanstack/react-query";
import { Film, Megaphone, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedFeedItem, UnifiedFeedKind } from "@/lib/unified-feed";
import { youtubeId } from "@/lib/video";
import { TaxonomyStrip, type TaxonomyStripItem } from "@/components/site/taxonomy-strip";

type PreviewKind = "infrastructure" | "campaign" | "video";
type PreviewRow = {
  id: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  end_date?: string | null;
  report_published?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  updated_at?: string | null;
};

function toFeedItem(kind: UnifiedFeedKind, row: PreviewRow): UnifiedFeedItem {
  const createdAt = row.created_at ?? row.start_date ?? "";
  return {
    key: `${kind}:${row.id}`,
    kind,
    label: kind === "infrastructure" ? "Infrastructure Issue" : kind === "campaign" ? "Campaign" : "Video",
    sourceId: row.id,
    title: row.title ?? "Published Share Barabara update",
    body: row.summary ?? row.description ?? "",
    location: null,
    href: kind === "infrastructure" ? `/infrastructure-issues/${row.id}` : kind === "campaign" ? `/campaigns/${row.id}` : "/videos",
    imageUrl: row.image_url ?? null,
    mediaUrl: row.video_url ?? null,
    authorId: null,
    createdAt,
    publishedAt: createdAt || null,
    updatedAt: row.updated_at ?? null,
    status: row.status ?? null,
    moderationStatus: null,
    hashtags: [],
    media: [],
  };
}
const config: Record<
  PreviewKind,
  { title: string; href: string; empty: string; icon: typeof Film }
> = {
  infrastructure: {
    title: "Infrastructure Issues",
    href: "/infrastructure-issues",
    empty: "No published infrastructure issues yet.",
    icon: Wrench,
  },
  campaign: {
    title: "Campaigns",
    href: "/campaigns",
    empty: "No active public campaigns yet.",
    icon: Megaphone,
  },
  video: { title: "Videos", href: "/videos", empty: "No published videos yet.", icon: Film },
};

function PreviewCard({ item }: { item: UnifiedFeedItem }) {
  const image =
    item.imageUrl ??
    (item.mediaUrl && youtubeId(item.mediaUrl)
      ? `https://i.ytimg.com/vi/${youtubeId(item.mediaUrl)}/hqdefault.jpg`
      : null);
  return (
    <a
      href={item.href}
      className="group overflow-hidden rounded-lg border border-border bg-card card-elevated transition-colors hover:border-accent"
    >
      {image ? (
        <img
          src={image}
          alt={item.title}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div
          className="flex aspect-video items-center justify-center bg-primary/5 text-brand-blue"
          aria-hidden="true"
        >
          <span className="rounded-full bg-accent/20 p-3">
            <span className="text-xs font-bold uppercase">{item.label}</span>
          </span>
        </div>
      )}
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          {item.label}
        </p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-brand-navy group-hover:underline">
          {item.title}
        </h3>
        {item.body ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
        ) : null}
      </div>
    </a>
  );
}

function ContentSection({
  kind,
  items,
  taxonomyItems = [],
}: {
  kind: PreviewKind;
  items: UnifiedFeedItem[];
  taxonomyItems?: TaxonomyStripItem[];
}) {
  const section = config[kind];
  const Icon = section.icon;
  return (
    <section
      className="public-content-container py-4"
      aria-labelledby={`homepage-${kind}-heading`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id={`homepage-${kind}-heading`}
          className="flex items-center gap-2 text-[1.44375rem] font-bold"
        >
          <Icon className="size-6 text-accent" />
          {section.title}
        </h2>
        <a href={section.href} className="text-sm font-semibold text-brand-blue underline">
          View all
        </a>
      </div>
      {items.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <PreviewCard key={item.key} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
          {section.empty}
        </p>
      )}
      {kind === "infrastructure" ? (
        <TaxonomyStrip heading="Browse infrastructure issues by type" items={taxonomyItems} />
      ) : null}
    </section>
  );
}

export function HomepageContentPreviews({
  infrastructureTaxonomy = [],
}: {
  infrastructureTaxonomy?: TaxonomyStripItem[];
}) {
  const { data: items = [] } = useQuery({
    queryKey: ["homepage-content-previews"],
    queryFn: async () => {
      const [infrastructure, campaigns, videos] = await Promise.all([
        supabase.from("infrastructure_issues").select("id,title,summary,image_url,status,created_at,updated_at").eq("status", "approved").order("created_at", { ascending: false }).limit(18),
        supabase.from("campaigns").select("id,title,description,image_url,start_date,end_date,report_published,created_at,updated_at").order("start_date", { ascending: false }).limit(18),
        supabase.from("videos").select("id,title,description,image_url,video_url,status,created_at,updated_at").eq("status", "featured").order("created_at", { ascending: false }).limit(18),
      ]);
      for (const result of [infrastructure, campaigns, videos]) if (result.error) throw result.error;
      const today = new Date().toISOString().slice(0, 10);
      return [
        ...(infrastructure.data ?? []).map((row) => toFeedItem("infrastructure", row)),
        ...(campaigns.data ?? []).filter((row) => row.end_date >= today || row.report_published === true).map((row) => toFeedItem("campaign", row)),
        ...(videos.data ?? []).map((row) => toFeedItem("video", row)),
      ];
    },
    staleTime: 60_000,
  });
  return (
    <>
      {(["infrastructure", "campaign", "video"] as const).map((kind) => (
        <ContentSection
          key={kind}
          kind={kind}
          items={items.filter((item) => item.kind === kind).slice(0, 3)}
          taxonomyItems={infrastructureTaxonomy}
        />
      ))}
    </>
  );
}
