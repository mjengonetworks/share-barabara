import { useQuery } from "@tanstack/react-query";
import { EditorialTripleCard } from "@/components/site/global-editorial-preview";
import { useProfileAvatars, useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { fetchMostViewed, mostViewedToFeedItem, type MostViewedTab } from "@/lib/most-viewed";
import type { PreviewItem } from "@/lib/global-editorial-preview";

const cards: Array<{ tab: MostViewedTab; title: string; tone: "white" | "blue" | "navy" }> = [
  { tab: "alerts", title: "Most Viewed Alerts", tone: "white" },
  { tab: "articles", title: "Most Viewed Articles", tone: "blue" },
  { tab: "reports", title: "Most Viewed Accident Reports", tone: "navy" },
];

export function HomepageMostViewed() {
  const query = useQuery({
    queryKey: ["homepage-most-viewed-12h"],
    queryFn: async () =>
      Promise.all(
        cards.map(async (card) => ({ ...card, rows: await fetchMostViewed(card.tab, 12, 3) })),
      ),
    staleTime: 60_000,
  });
  const groups = (query.data ?? []).map((card) => ({
    ...card,
    items: card.rows.map((row) => mostViewedToFeedItem(card.tab, row)),
  }));
  const authorIds = groups.flatMap((group) =>
    group.items.map((item) => item.authorId).filter((id): id is string => Boolean(id)),
  );
  const { data: names = {} } = useProfileNames(authorIds);
  const { data: usernames = {} } = useProfileUsernames(authorIds);
  const { data: avatars = {} } = useProfileAvatars(authorIds);
  const identities = Object.fromEntries(
    authorIds.map((id) => [id, { name: names[id], username: usernames[id], avatar: avatars[id] }]),
  );
  const populated = groups.filter((group) => group.items.length);
  if (!query.isLoading && !populated.length) return null;
  return (
    <section
      className="public-content-container py-4"
      aria-labelledby="homepage-most-viewed-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="homepage-most-viewed-heading" className="text-[1.44375rem] font-bold">
            Most Viewed — Last 12 Hours
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by genuine recorded views in the rolling 12-hour window.
          </p>
        </div>
        <a
          href="/trending?tab=alerts&range=12h"
          className="text-sm font-semibold text-brand-blue underline"
        >
          View trending
        </a>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {populated.map((group) => (
          <EditorialTripleCard
            key={group.tab}
            title={group.title}
            items={group.items.map((item): PreviewItem => ({
              id: item.key,
              title: item.title,
              href: item.href,
              imageUrl: item.imageUrl,
              category: item.label,
              destination: "media",
              activity: item,
            }))}
            identities={identities}
            tone={group.tone}
            viewAllHref={`/trending?tab=${group.tab}&range=12h`}
          />
        ))}
      </div>
    </section>
  );
}
