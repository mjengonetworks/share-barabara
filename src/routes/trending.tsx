import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMostViewed,
  fetchMostViewedTaxonomy,
  hoursForRange,
  mostViewedToFeedItem,
  type MostViewedTab,
} from "@/lib/most-viewed";
import { timeAgo } from "@/lib/format";

const tabs: Array<{ value: MostViewedTab; label: string }> = [
  { value: "alerts", label: "Alerts" },
  { value: "articles", label: "Articles" },
  { value: "reports", label: "Accident Reports" },
];
const ranges = [
  ["12h", "Last 12 Hours"],
  ["24h", "Last 24 Hours"],
  ["7d", "Past 7 Days"],
  ["month", "Past Month"],
  ["year", "Past Year"],
] as const;

export const Route = createFileRoute("/trending")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: tabs.some((tab) => tab.value === search.tab) ? (search.tab as MostViewedTab) : "alerts",
    range: typeof search.range === "string" && search.range in hoursForRange ? search.range : "12h",
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  component: TrendingPage,
});

function TrendingPage() {
  const { tab, range, category } = Route.useSearch();
  const hours = hoursForRange[range];
  const query = useQuery({
    queryKey: ["trending-page", tab, range],
    queryFn: async () =>
      Promise.all([fetchMostViewed(tab, hours, 30), fetchMostViewedTaxonomy(tab)]),
    staleTime: 60_000,
  });
  const rows = (query.data?.[0] ?? [])
    .filter((row) => {
      if (!category) return true;
      const values =
        tab === "articles"
          ? [row.category, ...(Array.isArray(row.categories) ? row.categories : [])]
          : tab === "alerts"
            ? [row.hazard_type]
            : [row.severity, row.incident_type];
      return values.some((value) => value === category);
    })
    .map((row) => mostViewedToFeedItem(tab, row));
  return (
    <main className="public-content-container py-6 sm:py-8">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-blue">
          Ranked by recorded views
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-brand-blue">Trending</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Explore the most viewed eligible Share Barabara content by type and time window.
        </p>
      </header>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Trending content type">
        {tabs.map((item) => (
          <Link
            key={item.value}
            to="/trending"
            search={{ tab: item.value, range, ...(category ? { category } : {}) }}
            className={
              tab === item.value
                ? "rounded-full bg-brand-blue px-3 py-2 text-sm font-bold text-white"
                : "rounded-full border border-border px-3 py-2 text-sm font-semibold"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Trending time window">
        {ranges.map(([value, label]) => (
          <Link
            key={value}
            to="/trending"
            search={{ tab, range: value, ...(category ? { category } : {}) }}
            className={
              range === value
                ? "rounded-full bg-accent px-3 py-2 text-sm font-bold text-[#101F43]"
                : "rounded-full border border-border px-3 py-2 text-sm font-semibold"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      {(query.data?.[1] ?? []).length ? (
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Trending categories">
          {query.data?.[1].map((item) => (
            <Link
              key={item}
              to="/trending"
              search={{ tab, range, category: item }}
              className={
                category === item
                  ? "shrink-0 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-bold text-white"
                  : "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
              }
            >
              {item}
            </Link>
          ))}
        </nav>
      ) : null}
      <section className="mt-8" aria-labelledby="trending-results-heading">
        <h2 id="trending-results-heading" className="text-xl font-bold">
          {tabs.find((item) => item.value === tab)?.label} ·{" "}
          {ranges.find(([value]) => value === range)?.[1]}
        </h2>
        {rows.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <article className="overflow-hidden rounded-xl border border-border bg-card card-elevated">
              <div className="aspect-[16/8] bg-muted">
                {rows[0].imageUrl ? (
                  <img src={rows[0].imageUrl} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">
                  #1 · {rows[0].label}
                </p>
                <Link
                  to={rows[0].href}
                  className="mt-2 block text-2xl font-extrabold text-brand-blue hover:underline"
                >
                  {rows[0].title}
                </Link>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{rows[0].body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Published {timeAgo(rows[0].publishedAt ?? rows[0].createdAt)}
                </p>
              </div>
            </article>
            <ol className="space-y-3">
              {rows.slice(1).map((item, index) => (
                <li
                  key={item.key}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <span className="text-xl font-extrabold text-accent">{index + 2}</span>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-16 shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <Link to={item.href} className="font-bold text-brand-blue hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(item.publishedAt ?? item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="mt-4 rounded border border-dashed border-border p-5 text-sm text-muted-foreground">
            No eligible recorded views are available for this window and filter.
          </p>
        )}
      </section>
    </main>
  );
}
