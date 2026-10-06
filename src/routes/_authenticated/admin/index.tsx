import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  addMonths,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { Flame, Newspaper, ShieldAlert, TriangleAlert } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard: Share Barabara Admin" }] }),
  component: OverviewPage,
});

type Period = "today" | "week" | "month" | "year" | "all" | "specific";
const PERIODS: { key: Period; label: string; hoursBack: number }[] = [
  { key: "today", label: "Today", hoursBack: 24 },
  { key: "week", label: "This week", hoursBack: 24 * 7 },
  { key: "month", label: "This month", hoursBack: 24 * 30 },
  { key: "year", label: "This year", hoursBack: 24 * 365 },
  { key: "all", label: "All time", hoursBack: 24 * 365 * 100 },
];

function periodBounds(period: Period, now: Date, monthValue: string) {
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: now, prevStart: startOfDay(subDays(now, 1)), prevEnd: startOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: now, prevStart: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), prevEnd: startOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(now), end: now, prevStart: startOfMonth(subMonths(now, 1)), prevEnd: startOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: now, prevStart: startOfYear(subYears(now, 1)), prevEnd: startOfYear(now) };
    case "specific": {
      const selected = monthValue ? new Date(`${monthValue}-01T00:00:00`) : startOfMonth(now);
      const start = startOfMonth(selected);
      return { start, end: addMonths(start, 1), prevStart: startOfMonth(subMonths(start, 1)), prevEnd: start };
    }
    case "all":
      return { start: new Date(0), end: now, prevStart: null, prevEnd: null };
  }
}

function countBetween(dates: string[], start: Date, end: Date) {
  return dates.filter((d) => {
    const t = new Date(d).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;
}

function DeltaBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const delta = current - previous;
  const pct = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0;
  const positive = delta >= 0;
  return (
    <span className={`text-xs font-semibold ${positive ? "text-safe" : "text-destructive"}`}>
      {positive ? "+" : ""}
      {pct}% vs previous period
    </span>
  );
}

function useDailySeries(dates: string[], days: number) {
  return useMemo(() => {
    const now = new Date();
    const start = subDays(startOfDay(now), days - 1);
    const buckets = new Map<string, number>();
    for (const d of eachDayOfInterval({ start, end: now })) buckets.set(format(d, "MMM d"), 0);
    for (const d of dates) {
      const key = format(new Date(d), "MMM d");
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets, ([date, count]) => ({ date, count }));
  }, [dates, days]);
}

/** Zips two same-length, same-date-range daily series into one row per day
 *  so both lines can share a single chart x-axis. */
function mergeSeries(
  a: { date: string; count: number }[],
  b: { date: string; count: number }[],
  keyA: string,
  keyB: string,
) {
  return a.map((row, i) => ({ date: row.date, [keyA]: row.count, [keyB]: b[i]?.count ?? 0 }));
}

function useContentStats(
  table: "news" | "accident_reports" | "alerts",
  status: string,
  dateColumn: string,
  viewsTable: string,
  viewsDateColumn: string,
) {
  const { data: items = [] } = useQuery({
    queryKey: ["admin-overview", table],
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows: unknown[] = [];
      // Supabase applies a server row limit even when no explicit limit is
      // supplied. Page until the complete available history is collected so
      // All time is not a relabelled 2,000-row window.
      for (let page = 0; ; page += 1) {
        const { data, error } = await supabase
          .from(table as never)
          .select(`id, title, ${dateColumn}`)
          .eq("status", status)
          .not(dateColumn, "is", null)
          .order(dateColumn, { ascending: false })
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows as { id: string; title: string; [key: string]: unknown }[];
    },
  });

  const { data: views = [] } = useQuery({
    queryKey: ["admin-overview-views", viewsTable],
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows: Record<string, string>[] = [];
      for (let page = 0; ; page += 1) {
        const { data, error } = await supabase
          .from(viewsTable as never)
          .select(viewsDateColumn)
          .order(viewsDateColumn, { ascending: false })
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as Record<string, string>[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });

  const itemDates = items.map((i) => i[dateColumn] as string);
  const viewDates = views.map((v) => v[viewsDateColumn] as string);
  return { itemDates, viewDates, itemCount: items.length };
}

function OverviewPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [monthValue, setMonthValue] = useState("");
  // Recomputed every render (not memoized) so the refetchInterval ticks below
  // actually advance the period window instead of comparing against a frozen "now".
  const now = new Date();
  const { start, end, prevStart, prevEnd } = periodBounds(period, now, monthValue);
  const activePeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[2];

  const [articlesLimit, setArticlesLimit] = useState(5);
  const [reportsLimit, setReportsLimit] = useState(5);
  const [alertsLimit, setAlertsLimit] = useState(5);
  const changePeriod = (p: Period) => {
    setPeriod(p);
    setArticlesLimit(5);
    setReportsLimit(5);
    setAlertsLimit(5);
  };

  const articles = useContentStats("news", "published", "published_at", "news_views", "created_at");
  const reports = useContentStats(
    "accident_reports",
    "approved",
    "reviewed_at",
    "accident_report_views",
    "created_at",
  );
  const alerts = useContentStats("alerts", "active", "created_at", "alert_views", "created_at");
  const { data: reviewQueue = {} } = useQuery<Record<string, number | null>>({
    queryKey: ["admin-review-queue"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const count = async (table: string, status: string) => {
        const { count: value, error } = await (supabase.from(table) as any).select("id", { count: "exact", head: true }).eq("status", status);
        if (error) return null;
        return value ?? 0;
      };
      const [articles, articleDrafts, reports, alerts, feed, updates] = await Promise.all([
        count("news", "pending_review"),
        count("news", "draft"),
        count("accident_reports", "pending"),
        count("alerts", "pending"),
        count("feed_posts", "pending"),
        count("editorial_updates", "draft"),
      ]);
      return { articles, articleDrafts, reports, alerts, feed, updates };
    },
  });

  const { data: trendingArticles = [] } = useQuery({
    queryKey: ["admin-trending-articles", period, articlesLimit],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: activePeriod.hoursBack,
        result_limit: articlesLimit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trendingReports = [] } = useQuery({
    queryKey: ["admin-trending-reports", period, reportsLimit],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_reports", {
        hours_back: activePeriod.hoursBack,
        result_limit: reportsLimit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trendingAlerts = [] } = useQuery({
    queryKey: ["admin-trending-alerts", period, alertsLimit],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_alerts", {
        hours_back: activePeriod.hoursBack,
        result_limit: alertsLimit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const articlesSeries = useDailySeries(articles.itemDates, 30);
  const articleViewsSeries = useDailySeries(articles.viewDates, 30);
  const reportsSeries = useDailySeries(reports.itemDates, 30);
  const reportViewsSeries = useDailySeries(reports.viewDates, 30);
  const alertsSeries = useDailySeries(alerts.itemDates, 30);
  const alertViewsSeries = useDailySeries(alerts.viewDates, 30);

  const articlesPublished = countBetween(articles.itemDates, start, end);
  const articlesPublishedPrev = prevStart && prevEnd ? countBetween(articles.itemDates, prevStart, prevEnd) : null;
  const articleViews = countBetween(articles.viewDates, start, end);
  const articleViewsPrev = prevStart && prevEnd ? countBetween(articles.viewDates, prevStart, prevEnd) : null;

  const reportsFiled = countBetween(reports.itemDates, start, end);
  const reportsFiledPrev = prevStart && prevEnd ? countBetween(reports.itemDates, prevStart, prevEnd) : null;
  const reportViews = countBetween(reports.viewDates, start, end);
  const reportViewsPrev = prevStart && prevEnd ? countBetween(reports.viewDates, prevStart, prevEnd) : null;

  const alertsPosted = countBetween(alerts.itemDates, start, end);
  const alertsPostedPrev = prevStart && prevEnd ? countBetween(alerts.itemDates, prevStart, prevEnd) : null;
  const alertViews = countBetween(alerts.viewDates, start, end);
  const alertViewsPrev = prevStart && prevEnd ? countBetween(alerts.viewDates, prevStart, prevEnd) : null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Overview
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Site performance</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Articles and accident reports posted and viewed, independent of any external analytics tool.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            onClick={() => changePeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <Button size="sm" variant={period === "specific" ? "default" : "outline"} onClick={() => changePeriod("specific")}>Specific month</Button>
        <label className="sr-only" htmlFor="performance-month">Choose month</label>
        <input id="performance-month" type="month" value={monthValue} onChange={(event) => { setMonthValue(event.target.value); setPeriod("specific"); }} className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Newspaper className="size-3.5" /> Articles published
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(articlesPublished)}</p>
          <DeltaBadge current={articlesPublished} previous={articlesPublishedPrev} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Article views
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(articleViews)}</p>
          <DeltaBadge current={articleViews} previous={articleViewsPrev} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldAlert className="size-3.5" /> Reports filed
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(reportsFiled)}</p>
          <DeltaBadge current={reportsFiled} previous={reportsFiledPrev} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Report views
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(reportViews)}</p>
          <DeltaBadge current={reportViews} previous={reportViewsPrev} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TriangleAlert className="size-3.5" /> Alerts posted
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(alertsPosted)}</p>
          <DeltaBadge current={alertsPosted} previous={alertsPostedPrev} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Alert views
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{num(alertViews)}</p>
          <DeltaBadge current={alertViews} previous={alertViewsPrev} />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Refreshes automatically every 30 seconds.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-card p-5 card-elevated" aria-labelledby="admin-review-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Workspace</p><h2 id="admin-review-heading" className="mt-1 text-lg font-bold">Items requiring review</h2><p className="mt-1 text-sm text-muted-foreground">Live queue counts from the current moderation and editorial tables. An em dash means the optional table is not available.</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link to="/admin/articles">Add News Article</Link></Button><Button asChild size="sm" variant="outline"><Link to="/admin/alerts">Add Alert</Link></Button><Button asChild size="sm" variant="outline"><Link to="/admin/reports">Add Accident Report</Link></Button></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[{ label: "Articles pending review", key: "articles", to: "/admin/articles" }, { label: "Article drafts", key: "articleDrafts", to: "/admin/articles" }, { label: "Reports pending review", key: "reports", to: "/admin/reports" }, { label: "Alerts pending review", key: "alerts", to: "/admin/alerts" }, { label: "Feed posts pending", key: "feed", to: "/admin/feed" }, { label: "Editorial updates in draft", key: "updates", to: "/admin/alerts" }].map((item) => <Link key={item.key} to={item.to} className="rounded border border-border p-3 transition-colors hover:border-accent"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p><p className="mt-2 font-display text-2xl font-extrabold">{reviewQueue[item.key] === null || reviewQueue[item.key] === undefined ? "—" : num(reviewQueue[item.key]!)}</p></Link>)}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Alerts: posted vs viewed (30 days)
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergeSeries(alertsSeries, alertViewsSeries, "Posted", "Views")}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Posted"
                  stroke="var(--safe)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Views"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Flame className="size-4 text-destructive" /> Trending alerts ·{" "}
            {activePeriod.label.toLowerCase()}
          </h2>
          <ul className="mt-3 space-y-2">
            {trendingAlerts.map((a) => (
              <li key={a.id}>
                <Link
                  to="/alerts/$alertId"
                  params={{ alertId: a.id }}
                  className="text-sm text-brand-blue hover:underline"
                >
                  {a.title}
                </Link>
              </li>
            ))}
            {trendingAlerts.length === 0 ? (
              <li className="text-sm text-muted-foreground">No alert views in this period yet.</li>
            ) : null}
          </ul>
          {trendingAlerts.length === alertsLimit ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setAlertsLimit((n) => n + 10)}
            >
              View 10 more
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Articles: published vs viewed (30 days)
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mergeSeries(articlesSeries, articleViewsSeries, "Published", "Views")}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Published"
                  stroke="var(--brand-blue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Views"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Reports: filed vs viewed (30 days)
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergeSeries(reportsSeries, reportViewsSeries, "Filed", "Views")}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Filed"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Views"
                  stroke="var(--caution)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Flame className="size-4 text-destructive" /> Trending articles ·{" "}
            {activePeriod.label.toLowerCase()}
          </h2>
          <ul className="mt-3 space-y-2">
            {trendingArticles.map((a) => (
              <li key={a.id}>
                <Link
                  to="/news/$slug"
                  params={{ slug: a.slug }}
                  className="text-sm text-brand-blue hover:underline"
                >
                  {a.title}
                </Link>
              </li>
            ))}
            {trendingArticles.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No article views in this period yet.
              </li>
            ) : null}
          </ul>
          {trendingArticles.length === articlesLimit ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setArticlesLimit((n) => n + 10)}
            >
              View 10 more
            </Button>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Flame className="size-4 text-destructive" /> Trending reports ·{" "}
            {activePeriod.label.toLowerCase()}
          </h2>
          <ul className="mt-3 space-y-2">
            {trendingReports.map((r) => (
              <li key={r.id}>
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="text-sm text-brand-blue hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
            {trendingReports.length === 0 ? (
              <li className="text-sm text-muted-foreground">No report views in this period yet.</li>
            ) : null}
          </ul>
          {trendingReports.length === reportsLimit ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setReportsLimit((n) => n + 10)}
            >
              View 10 more
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
