import { useQuery } from "@tanstack/react-query";
import { Film, Megaphone, Wrench } from "lucide-react";
import { getUnifiedFeed, type UnifiedFeedItem } from "@/lib/unified-feed";
import { youtubeId } from "@/lib/video";

type PreviewKind = "infrastructure" | "campaign" | "video";
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

function ContentSection({ kind, items }: { kind: PreviewKind; items: UnifiedFeedItem[] }) {
  const section = config[kind];
  const Icon = section.icon;
  return (
    <section
      className="public-content-container py-10"
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
        <p className="mt-5 rounded border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {section.empty}
        </p>
      )}
    </section>
  );
}

export function HomepageContentPreviews() {
  const { data: items = [] } = useQuery({
    queryKey: ["homepage-content-previews"],
    queryFn: () => getUnifiedFeed({ limit: 60 }),
    staleTime: 60_000,
  });
  return (
    <>
      {(["infrastructure", "campaign", "video"] as const).map((kind) => (
        <ContentSection
          key={kind}
          kind={kind}
          items={items.filter((item) => item.kind === kind).slice(0, 3)}
        />
      ))}
    </>
  );
}
