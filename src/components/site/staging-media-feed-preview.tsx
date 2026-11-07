import { EditorialTripleCard } from "@/components/site/global-editorial-preview";
import { UnifiedFeedActivity } from "@/components/site/unified-feed-activity";
import {
  stagingPreviewFeed,
  stagingPreviewIdentities,
  stagingPreviewMediaFeedGroups,
} from "@/lib/staging-media-feed-preview";

function PreviewSidebar({ title }: { title: string }) {
  return (
    <aside className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="mt-3 divide-y divide-border/70">
        {stagingPreviewFeed.slice(0, 3).map((item) => (
          <a
            key={item.key}
            href={item.href}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UnifiedFeedActivity
              compact
              item={item}
              identity={stagingPreviewIdentities[item.authorId ?? ""]}
            />
          </a>
        ))}
      </div>
      <a
        href="/staging-media-feed-preview"
        className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
      >
        View all preview activity
      </a>
    </aside>
  );
}

export function StagingMediaFeedPreview() {
  const cards = [
    { title: "Latest", items: stagingPreviewMediaFeedGroups.latest },
    { title: "Most Viewed · Last 12 Hours", items: stagingPreviewMediaFeedGroups.twelveHours },
    { title: "Most Viewed · Last 24 Hours", items: stagingPreviewMediaFeedGroups.twentyFourHours },
  ];
  return (
    <div className="public-content-container py-8 sm:py-10">
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Preview data only.</strong> This isolated visual review contains synthetic published
        activity. It does not connect to Supabase, authentication, storage, mutations or external
        integrations.
      </div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-foreground">
            Share Barabara
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-brand-navy sm:text-4xl">
            Media &amp; Feed
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Community-style presentation of the latest eligible platform activity.
          </p>
        </div>
        <a
          href="/staging-media-feed-preview"
          className="text-sm font-bold text-brand-blue underline"
        >
          View all
        </a>
      </header>
      <section aria-labelledby="preview-feed-heading">
        <h2 id="preview-feed-heading" className="sr-only">
          Media &amp; Feed preview cards
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {cards.map(({ title, items }, index) => (
            <EditorialTripleCard
              key={title}
              title={title}
              tone={(["white", "blue", "navy"] as const)[index]}
              items={items.map((item) => ({
                id: item.key,
                title: item.title,
                href: item.href,
                imageUrl: item.imageUrl,
                category: item.label,
                destination: "media" as const,
                activity: item,
              }))}
              identities={stagingPreviewIdentities}
            />
          ))}
        </div>
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Detail sidebar previews">
        <PreviewSidebar title="Article detail · Latest Media & Feed" />
        <PreviewSidebar title="Accident report detail · Latest Media & Feed" />
      </section>
    </div>
  );
}
