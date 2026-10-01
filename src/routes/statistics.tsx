import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KENYA_COUNTIES, PARTIES_INVOLVED } from "@/lib/constants";
import { useHazardTypes, useReportSeverities } from "@/hooks/useTaxonomy";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { num } from "@/lib/format";
import { BannerAd } from "@/components/site/banner-ad";
import { displayReportCount } from "@/lib/report-metrics";
import { percentageChange, reportMonthBuckets, sumKnown } from "@/lib/statistics.mjs";
import { MjengoPreviews } from "@/components/site/mjengo-previews";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Kenya Road Crash Statistics: Share Barabara" },
      {
        name: "description",
        content:
          "Road crash data for Kenya: yearly fatalities, monthly trend, crash causes, vehicle types, road classes, time of day, county hotspots and victim categories.",
      },
      { property: "og:title", content: "Kenya Road Crash Statistics" },
      {
        property: "og:description",
        content:
          "Fatalities by year, month, cause, vehicle type, road class, time of day and county across Kenya.",
      },
    ],
  }),
  component: StatisticsPage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_COLORS = [
  "var(--destructive)",
  "var(--caution)",
  "var(--accent)",
  "var(--primary)",
  "var(--safe)",
  "var(--muted-foreground)",
  "var(--brand-blue)",
  "var(--border)",
];

function useLiveCount(key: string, table: string, filter?: [string, string]) {
  return useQuery({
    queryKey: ["live-count", key],
    queryFn: async () => {
      let query = supabase.from(table as never).select("*", { count: "exact", head: true });
      if (filter) query = query.eq(filter[0], filter[1]);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useGroupCounts(table: "alerts" | "accident_reports", column: string) {
  return useQuery({
    queryKey: ["group-counts", table, column],
    queryFn: async () => {
      let query = supabase.from(table).select(column);
      if (table === "accident_reports") query = query.eq("status", "approved");
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Record<string, string>[];
      const counts: Record<string, number> = {};
      for (const row of rows) {
        const key = row[column];
        if (key === undefined) continue;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    },
  });
}

type CasualtyBreakdownRow = Record<string, { dead?: number; injured?: number }> | null;

/** Actual dead + injured counts per party, summed from the casualty
 *  breakdown reporters (or an admin, backfilling later) filled in on alerts
 *  and reports, not just how many rows merely tagged a party as present. */
function usePartiesCasualtyCounts() {
  return useQuery({
    queryKey: ["parties-casualty-counts"],
    queryFn: async () => {
      const [{ data: alerts, error: e1 }, { data: reports, error: e2 }] = await Promise.all([
        supabase.from("alerts").select("casualty_breakdown"),
        supabase.from("accident_reports").select("casualty_breakdown").eq("status", "approved"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const counts: Record<string, number> = {};
      const unknown: Record<string, boolean> = {};
      for (const row of [...(alerts ?? []), ...(reports ?? [])]) {
        const breakdown = row.casualty_breakdown as CasualtyBreakdownRow;
        for (const [party, c] of Object.entries(breakdown ?? {})) {
          for (const value of [c.dead, c.injured]) {
            if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
              counts[party] = (counts[party] ?? 0) + value;
            } else {
              unknown[party] = true;
            }
          }
        }
      }
      return { counts, unknown };
    },
  });
}

type LiveReport = {
  occurred_at: string;
  county: string;
  severity: string;
  fatalities: number | null;
  casualties: number | null;
  parties_involved: string[];
};

/** This year's and last year's approved reports, fetched once and filtered/
 *  aggregated client-side, the live, community-fed counterpart to the
 *  admin-entered yearly_stats figures below. */
function useLiveYearReports() {
  const currentYear = new Date().getFullYear();
  return useQuery({
    queryKey: ["live-year-reports", currentYear],
    queryFn: async () => {
      const since = new Date(currentYear - 1, 0, 1).toISOString();
      const { data, error } = await supabase
        .from("accident_reports")
        .select("occurred_at, county, severity, fatalities, casualties, parties_involved")
        .eq("status", "approved")
        .gte("occurred_at", since);
      if (error) throw error;
      return (data ?? []) as LiveReport[];
    },
  });
}

/** Real roads ranked by their published-report toll, each linking through to
 *  its own road profile — the concrete, drill-down-able counterpart to the
 *  aggregate road-class chart above it. */
function useTopRoads(limit = 8) {
  return useQuery({
    queryKey: ["top-roads", limit],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from("accident_reports")
        .select("road_id, fatalities, casualties")
        .eq("status", "approved")
        .not("road_id", "is", null);
      if (error) throw error;
      const totals = new Map<string, { fatalities: number; casualties: number; fatalitiesUnknown: boolean; casualtiesUnknown: boolean; crashes: number }>();
      for (const r of reports ?? []) {
        if (!r.road_id) continue;
        const entry = totals.get(r.road_id) ?? { fatalities: 0, casualties: 0, fatalitiesUnknown: false, casualtiesUnknown: false, crashes: 0 };
        if (r.fatalities === null) entry.fatalitiesUnknown = true;
        else entry.fatalities += r.fatalities;
        if (r.casualties === null) entry.casualtiesUnknown = true;
        else entry.casualties += r.casualties;
        entry.crashes += 1;
        totals.set(r.road_id, entry);
      }
      const ranked = Array.from(totals, ([road_id, t]) => ({ road_id, ...t }))
        .sort((a, b) => b.fatalities - a.fatalities || b.crashes - a.crashes)
        .slice(0, limit);
      if (ranked.length === 0) return [];
      const { data: roads, error: roadsError } = await supabase
        .from("roads")
        .select("id, name, slug, county")
        .in(
          "id",
          ranked.map((r) => r.road_id),
        );
      if (roadsError) throw roadsError;
      const roadMap = new Map((roads ?? []).map((r) => [r.id, r]));
      return ranked
        .map((r) => ({ ...r, road: roadMap.get(r.road_id) }))
        .filter((r): r is typeof r & { road: NonNullable<typeof r.road> } => !!r.road);
    },
  });
}

function useStat<T>(table: string, order: string, asc = true) {
  return useQuery({
    queryKey: [table, order, asc],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .order(order, { ascending: asc });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function ChartCard({
  title,
  subtitle,
  height = "h-80",
  children,
}: {
  title: string;
  subtitle?: string;
  height?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-[1.155rem] font-bold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className={`mt-4 ${height} rounded-lg border border-border bg-card p-4`}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 6,
};

function NoYearData({ year }: { year: number }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      No data entered for {year} yet.
    </div>
  );
}

function StatisticsPage() {
  const navigate = useNavigate();
  const { data: hazardTypes = [] } = useHazardTypes();
  const { data: reportSeverities = [] } = useReportSeverities();
  const { data: yearly = [] } = useStat<{
    year: number;
    fatalities: number;
    serious_injuries: number;
    slight_injuries: number;
    crashes: number;
    registered_vehicles: number | null;
    deaths_per_100k: number | null;
  }>("yearly_stats", "year");

  const { data: counties = [] } = useStat<{
    id: string;
    county: string;
    fatalities: number;
    year: number;
  }>("county_stats", "fatalities", false);

  const { data: topRoads = [] } = useTopRoads();

  const { data: victims = [] } = useStat<{
    id: string;
    category: string;
    fatalities: number;
    year: number;
  }>("victim_stats", "fatalities", false);

  const { data: monthly = [] } = useStat<{
    month: number;
    fatalities: number;
    crashes: number;
    year: number;
  }>("monthly_stats", "month");

  const { data: causes = [] } = useStat<{
    id: string;
    cause: string;
    share: number;
    fatalities: number;
    year: number;
  }>("cause_stats", "fatalities", false);

  const { data: vehicles = [] } = useStat<{
    id: string;
    vehicle_type: string;
    crashes: number;
    fatalities: number;
    year: number;
  }>("vehicle_stats", "fatalities", false);

  const { data: bands = [] } = useStat<{
    id: string;
    band: string;
    fatalities: number;
    year: number;
  }>("time_of_day_stats", "sort_order");

  const { data: roadClasses = [] } = useStat<{
    id: string;
    road_class: string;
    fatalities: number;
    crashes: number;
    year: number;
  }>("road_class_stats", "fatalities", false);

  const { data: alertsCount } = useLiveCount("alerts", "alerts");
  const { data: reportsFiledCount } = useLiveCount("reports-approved", "accident_reports", [
    "status",
    "approved",
  ]);
  const { data: hazardCounts = {} } = useGroupCounts("alerts", "hazard_type");
  const { data: reportSeverityCounts = {} } = useGroupCounts("accident_reports", "severity");
  const { data: partyStats = { counts: {}, unknown: {} } } = usePartiesCasualtyCounts();

  const currentYear = new Date().getFullYear();
  const availableYears = yearly
    .map((y) => y.year)
    .slice()
    .reverse();
  const maxStatYear = yearly[yearly.length - 1]?.year ?? currentYear;
  const [statYear, setStatYear] = useState<number | null>(null);
  const activeYear = statYear ?? maxStatYear;

  const latest = yearly.find((y) => y.year === activeYear);
  const prev = yearly.find((y) => y.year === activeYear - 1);
  const yoy =
    latest && prev
      ? Math.round(((latest.fatalities - prev.fatalities) / prev.fatalities) * 1000) / 10
      : null;

  const monthlyForYear = monthly.filter((m) => m.year === activeYear);
  const monthlyData = monthlyForYear.map((m) => ({ ...m, label: MONTHS[m.month - 1] }));
  const causesForYear = causes.filter((c) => c.year === activeYear);
  const vehiclesForYear = vehicles.filter((v) => v.year === activeYear);
  const bandsForYear = bands.filter((b) => b.year === activeYear);
  const roadClassesForYear = roadClasses.filter((r) => r.year === activeYear);
  const countiesForYear = counties.filter((c) => c.year === activeYear);
  const victimsForYear = victims.filter((v) => v.year === activeYear);
  const totalVictims = victimsForYear.reduce((sum, v) => sum + v.fatalities, 0) || 1;
  const { data: liveReports = [] } = useLiveYearReports();
  const [liveCounty, setLiveCounty] = useState("all");
  const [liveSeverity, setLiveSeverity] = useState("all");
  const [liveParty, setLiveParty] = useState("all");
  const liveFiltered = liveCounty !== "all" || liveSeverity !== "all" || liveParty !== "all";

  const matchesLiveFilters = (r: LiveReport) =>
    (liveCounty === "all" || r.county === liveCounty) &&
    (liveSeverity === "all" || r.severity === liveSeverity) &&
    (liveParty === "all" || r.parties_involved.includes(liveParty));

  const jan1ThisYear = new Date(currentYear, 0, 1).getTime();
  const dayOfYear = Math.floor((Date.now() - jan1ThisYear) / 86_400_000);
  const jan1LastYear = new Date(currentYear - 1, 0, 1).getTime();

  const thisYearReports = liveReports.filter(
    (r) => new Date(r.occurred_at).getFullYear() === currentYear && matchesLiveFilters(r),
  );
  const lastYearToDateReports = liveReports.filter((r) => {
    const occurred = new Date(r.occurred_at);
    if (occurred.getFullYear() !== currentYear - 1) return false;
    const doy = Math.floor((occurred.getTime() - jan1LastYear) / 86_400_000);
    return doy <= dayOfYear && matchesLiveFilters(r);
  });

  const sumBy = (rows: LiveReport[], key: "fatalities" | "casualties") =>
    sumKnown(rows.map((r) => r[key])).value;

  const liveMonthly = reportMonthBuckets(thisYearReports, currentYear).map((bucket, i) => ({
    label: MONTHS[i],
    accidents: bucket.reports,
    fatalities: bucket.fatalities.value,
    injuries: bucket.injuries.value,
  }));

  const liveSeverityMix = ["minor", "serious", "fatal"].map((value) => ({
    value,
    label: reportSeverities.find((s) => s.value === value)?.label ?? value,
    count: thisYearReports.filter((r) => r.severity === value).length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PublicPageHero
        eyebrow="Road-safety data"
        title="Statistics"
        description="Explore the available road-safety evidence and the separate picture of what Share Barabara users have reported. Each dataset is labelled by its source and coverage."
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Reports without confirmed casualty totals are excluded from numeric sums rather than counted as zero.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          to="/alerts"
          className="rounded-lg border border-border bg-card p-6 transition-colors card-elevated hover:border-accent"
        >
          <p className="font-display text-3xl font-extrabold text-caution">
            {alertsCount === undefined ? "…" : num(alertsCount)}
          </p>
          <p className="mt-1 text-sm text-brand-blue underline">Hazard alerts reported</p>
        </Link>
        <Link
          to="/reports"
          className="rounded-lg border border-border bg-card p-6 transition-colors card-elevated hover:border-accent"
        >
          <p className="font-display text-3xl font-extrabold">
            {reportsFiledCount === undefined ? "…" : num(reportsFiledCount)}
          </p>
          <p className="mt-1 text-sm text-brand-blue underline">Approved reports published</p>
        </Link>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Alerts by hazard type
          </h2>
          <ul className="mt-4 space-y-1">
            {hazardTypes.map((h) => (
              <li key={h.value}>
                <Link
                  to="/alerts"
                  search={{ hazard: h.value }}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="text-brand-blue">{h.label}</span>
                  <span className="font-semibold">{hazardCounts[h.value] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Reports by severity
          </h2>
          <ul className="mt-4 space-y-1">
            {reportSeverities.map((s) => (
              <li key={s.value}>
                <Link
                  to="/reports"
                  search={{ severity: s.value }}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="text-brand-blue">{s.label}</span>
                  <span className="font-semibold">{reportSeverityCounts[s.value] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 card-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Who was involved
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Known dead and injured, from casualty counts filed on public alerts and approved reports.
          </p>
          <ul className="mt-4 space-y-2">
            {PARTIES_INVOLVED.map((p) => {
              const total = Object.values(partyStats.counts).reduce((s, v) => s + v, 0) || 1;
              const count = partyStats.counts[p.value] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <li key={p.value}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{p.label}</span>
                    <span className="font-semibold">
                      {count}
                      {partyStats.unknown[p.value] ? " + unknown" : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-14 border-t border-border pt-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-destructive">
            Live · counted from approved Share Barabara reports
          </p>
        </div>
        <h2 className="mt-2 text-[1.7325rem] font-extrabold">{currentYear} so far</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Share Barabara reported data only — not Kenya's official national road-safety total. The
          figures below count approved reports and exclude unknown casualty values from numeric sums.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-2">
          <Select value={liveCounty} onValueChange={setLiveCounty}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All counties</SelectItem>
              {KENYA_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={liveSeverity} onValueChange={setLiveSeverity}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {reportSeverities.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={liveParty} onValueChange={setLiveParty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone involved</SelectItem>
              {PARTIES_INVOLVED.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {liveFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLiveCounty("all");
                setLiveSeverity("all");
                setLiveParty("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(
            [
              {
                label: "Accidents recorded",
                curr: thisYearReports.length,
                prior: lastYearToDateReports.length,
                tone: "text-foreground",
              },
              {
                label: "Known deaths",
                curr: sumBy(thisYearReports, "fatalities"),
                prior: sumBy(lastYearToDateReports, "fatalities"),
                tone: "text-destructive",
              },
              {
                label: "Known injuries",
                curr: sumBy(thisYearReports, "casualties"),
                prior: sumBy(lastYearToDateReports, "casualties"),
                tone: "text-caution",
              },
            ] as const
          ).map((s) => {
            const change = percentageChange(s.curr, s.prior);
            return (
              <div
                key={s.label}
                className="rounded-lg border border-border bg-card p-6 card-elevated"
              >
                <p className={`font-display text-4xl font-extrabold ${s.tone}`}>{num(s.curr)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.label} in {currentYear}
                  {liveFiltered ? " (filtered)" : ""}
                </p>
                {change !== null ? (
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      change > 0 ? "text-destructive" : "text-safe"
                    }`}
                  >
                    {change > 0 ? "+" : ""}
                    {change}% vs the same point in {currentYear - 1}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Deaths &amp; injuries by month
            </h3>
            <div className="mt-3 h-64 rounded-lg border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="fatalities"
                    name="Deaths"
                    fill="var(--destructive)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="injuries"
                    name="Injuries"
                    fill="var(--caution)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Accidents by month
            </h3>
            <div className="mt-3 h-64 rounded-lg border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="accidents"
                    name="Accidents"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Severity mix this year
            </h3>
            <div className="mt-3 h-64 rounded-lg border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liveSeverityMix}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {liveSeverityMix.map((s) => (
                      <Cell
                        key={s.value}
                        fill={
                          s.value === "fatal"
                            ? "var(--destructive)"
                            : s.value === "serious"
                              ? "var(--caution)"
                              : "var(--safe)"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          All three charts follow the filters above.
        </p>
      </div>

      {topRoads.length > 0 ? (
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="text-[1.155rem] font-bold">Most dangerous roads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by fatalities in approved accident reports. Click through to a road's own profile
            for every alert and report filed against it.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topRoads.map((r) => (
              <Link
                key={r.road_id}
                to="/roads/$slug"
                params={{ slug: r.road.slug }}
                className="rounded-lg border border-border bg-card p-4 transition-colors card-elevated hover:border-accent"
              >
                <p className="flex items-center gap-1 font-semibold text-brand-blue hover:underline">
                  <MapPin className="size-4 shrink-0" /> {r.road.name}
                </p>
                {r.road.county ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.road.county}</p>
                ) : null}
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-destructive">
                    <strong>{r.fatalitiesUnknown ? "Not confirmed" : displayReportCount(r.fatalities)}</strong> deaths
                  </span>
                  <span className="text-caution">
                    <strong>{r.casualtiesUnknown ? "Not confirmed" : displayReportCount(r.casualties)}</strong> injured
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className={topRoads.length > 0 ? "mt-14" : "mt-14 border-t border-border pt-10"}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Open data
            </p>
            <h2 className="mt-2 text-[1.7325rem] font-extrabold">Kenya road crash statistics</h2>
          </div>
          {availableYears.length > 0 ? (
            <div>
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select value={String(activeYear)} onValueChange={(v) => setStatYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          These are legacy stored aggregate records with no source provenance in the repository.
          They are not presented as confirmed official or government statistics. No Share Barabara
          report count is used to create this series. The yearly fatality trend currently has data
          back to{" "}
          {availableYears.at(-1) ?? "2019"}; the breakdown charts fill in as more years are entered.
        </p>
      </div>

      {latest ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: `Deaths in ${latest.year}`,
              value: num(latest.fatalities),
              tone: "text-destructive",
            },
            {
              label: "Serious injuries",
              value: num(latest.serious_injuries),
              tone: "text-caution",
            },
            { label: "Recorded crashes", value: num(latest.crashes), tone: "text-foreground" },
            {
              label: "Deaths per 100,000 people",
              value: latest.deaths_per_100k ?? "N/A",
              tone: "text-foreground",
            },
            {
              label: "Registered vehicles",
              value: latest.registered_vehicles ? num(latest.registered_vehicles) : "N/A",
              tone: "text-foreground",
            },
            {
              label: "Slight injuries",
              value: num(latest.slight_injuries),
              tone: "text-foreground",
            },
            {
              label: "Change vs previous year",
              value: yoy === null ? "N/A" : `${yoy > 0 ? "+" : ""}${yoy}%`,
              tone: yoy !== null && yoy > 0 ? "text-destructive" : "text-safe",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-card p-6 card-elevated"
            >
              <p className={`font-display text-3xl font-extrabold ${s.tone}`}>{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <BannerAd />
      </div>

      <ChartCard title="Deaths and injuries by year">
        <LineChart data={yearly}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="fatalities"
            name="Fatalities"
            stroke="var(--destructive)"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="serious_injuries"
            name="Serious injuries"
            stroke="var(--caution)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="slight_injuries"
            name="Slight injuries"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartCard>

      <ChartCard
        title="Motorisation vs death rate"
        subtitle="Registered vehicles against deaths per 100,000 people."
      >
        <AreaChart data={yearly}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="registered_vehicles"
            name="Registered vehicles"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.15}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="deaths_per_100k"
            name="Deaths per 100k"
            stroke="var(--destructive)"
            fill="var(--destructive)"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ChartCard>

      <section className="mt-10">
        <h2 className="text-[1.155rem] font-bold">Deaths by month</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seasonality of road deaths in {activeYear}.
        </p>
        <div className="mt-4 h-80 rounded-lg border border-border bg-card p-4">
          {monthlyForYear.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="fatalities"
                  name="Fatalities"
                  fill="var(--destructive)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoYearData year={activeYear} />
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-[1.155rem] font-bold">Main causes of crashes</h2>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            {causesForYear.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={causesForYear}
                    dataKey="share"
                    nameKey="cause"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {causesForYear.map((c, i) => (
                      <Cell key={c.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoYearData year={activeYear} />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[1.155rem] font-bold">Deaths by vehicle type</h2>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            {vehiclesForYear.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehiclesForYear} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="vehicle_type"
                    width={140}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                  />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="fatalities"
                    name="Fatalities"
                    fill="var(--destructive)"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="crashes"
                    name="Crashes"
                    fill="var(--caution)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoYearData year={activeYear} />
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-[1.155rem] font-bold">When crashes kill</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The evening rush and the hours after dark are the deadliest.
          </p>
          <div className="mt-4 h-80 rounded-lg border border-border bg-card p-4">
            {bandsForYear.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandsForYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="band" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="fatalities" name="Fatalities" radius={[4, 4, 0, 0]}>
                    {bandsForYear.map((b) => (
                      <Cell
                        key={b.id}
                        fill={b.fatalities > 900 ? "var(--destructive)" : "var(--caution)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoYearData year={activeYear} />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[1.155rem] font-bold">Deaths by road class</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trunk highways carry the heaviest toll per kilometre.
          </p>
          <div className="mt-4 h-80 rounded-lg border border-border bg-card p-4">
            {roadClassesForYear.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roadClassesForYear} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="road_class"
                    width={150}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                  />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="fatalities"
                    name="Fatalities"
                    fill="var(--primary)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoYearData year={activeYear} />
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-[1.155rem] font-bold">Counties with the most deaths</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a bar to see reports for that county.
          </p>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            {countiesForYear.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countiesForYear} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="county"
                    width={90}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="fatalities"
                    name="Fatalities"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(entry) =>
                      navigate({ to: "/reports", search: { county: entry.county } })
                    }
                  >
                    {countiesForYear.map((c, i) => (
                      <Cell key={c.id} fill={i === 0 ? "var(--destructive)" : "var(--caution)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoYearData year={activeYear} />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[1.155rem] font-bold">Who is dying on our roads</h2>
          {victimsForYear.length === 0 ? <NoYearData year={activeYear} /> : null}
          <ul className="mt-4 space-y-4">
            {victimsForYear.map((v) => {
              const pct = Math.round((v.fatalities / totalVictims) * 100);
              return (
                <li key={v.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{v.category}</span>
                    <span className="text-muted-foreground">
                      {num(v.fatalities)} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Vulnerable road users (pedestrians, motorcyclists and their pillion passengers) make up
            the large majority of deaths. Speed management, helmets, footpaths and lighting are the
            interventions that shift these numbers.
          </p>
        </div>
      </section>
      <MjengoPreviews context="statistics" />
    </div>
  );
}
