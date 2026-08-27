import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PARTIES_INVOLVED } from "@/lib/constants";
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
      const { data, error } = await supabase.from(table).select(column);
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

function usePartiesCounts() {
  return useQuery({
    queryKey: ["group-counts-parties"],
    queryFn: async () => {
      const [{ data: alerts, error: e1 }, { data: reports, error: e2 }] = await Promise.all([
        supabase.from("alerts").select("parties_involved"),
        supabase.from("accident_reports").select("parties_involved"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const counts: Record<string, number> = {};
      for (const row of [...(alerts ?? []), ...(reports ?? [])]) {
        for (const p of row.parties_involved ?? []) counts[p] = (counts[p] ?? 0) + 1;
      }
      return counts;
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
      const totals = new Map<string, { fatalities: number; casualties: number; crashes: number }>();
      for (const r of reports ?? []) {
        if (!r.road_id) continue;
        const entry = totals.get(r.road_id) ?? { fatalities: 0, casualties: 0, crashes: 0 };
        entry.fatalities += r.fatalities;
        entry.casualties += r.casualties;
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
      <h2 className="text-2xl font-bold">{title}</h2>
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

  const { data: counties = [] } = useStat<{ id: string; county: string; fatalities: number }>(
    "county_stats",
    "fatalities",
    false,
  );

  const { data: topRoads = [] } = useTopRoads();

  const { data: victims = [] } = useStat<{ id: string; category: string; fatalities: number }>(
    "victim_stats",
    "fatalities",
    false,
  );

  const { data: monthly = [] } = useStat<{ month: number; fatalities: number; crashes: number }>(
    "monthly_stats",
    "month",
  );

  const { data: causes = [] } = useStat<{
    id: string;
    cause: string;
    share: number;
    fatalities: number;
  }>("cause_stats", "fatalities", false);

  const { data: vehicles = [] } = useStat<{
    id: string;
    vehicle_type: string;
    crashes: number;
    fatalities: number;
  }>("vehicle_stats", "fatalities", false);

  const { data: bands = [] } = useStat<{ id: string; band: string; fatalities: number }>(
    "time_of_day_stats",
    "sort_order",
  );

  const { data: roadClasses = [] } = useStat<{
    id: string;
    road_class: string;
    fatalities: number;
    crashes: number;
  }>("road_class_stats", "fatalities", false);

  const { data: alertsCount } = useLiveCount("alerts", "alerts");
  const { data: reportsFiledCount } = useLiveCount("reports-filed", "accident_reports");
  const { data: reportsApprovedCount } = useLiveCount("reports-approved", "accident_reports", [
    "status",
    "approved",
  ]);
  const { data: commentsCount } = useLiveCount("comments", "comments");
  const { data: hazardCounts = {} } = useGroupCounts("alerts", "hazard_type");
  const { data: reportSeverityCounts = {} } = useGroupCounts("accident_reports", "severity");
  const { data: partiesCounts = {} } = usePartiesCounts();

  const latest = yearly[yearly.length - 1];
  const prev = yearly[yearly.length - 2];
  const totalVictims = victims.reduce((sum, v) => sum + v.fatalities, 0) || 1;
  const monthlyData = monthly.map((m) => ({ ...m, label: MONTHS[m.month - 1] }));
  const yoy =
    latest && prev
      ? Math.round(((latest.fatalities - prev.fatalities) / prev.fatalities) * 1000) / 10
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Share Barabara
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Live statistics</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Kenyan road traffic crash data and what the Share Barabara community has reported so far,
        updated as it happens.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="mt-1 text-sm text-brand-blue underline">Accident reports filed</p>
        </Link>
        <Link
          to="/reports"
          className="rounded-lg border border-border bg-card p-6 transition-colors card-elevated hover:border-accent"
        >
          <p className="font-display text-3xl font-extrabold text-safe">
            {reportsApprovedCount === undefined ? "…" : num(reportsApprovedCount)}
          </p>
          <p className="mt-1 text-sm text-brand-blue underline">Reports verified &amp; published</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6 card-elevated">
          <p className="font-display text-3xl font-extrabold">
            {commentsCount === undefined ? "…" : num(commentsCount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Community comments</p>
        </div>
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
          <ul className="mt-4 space-y-2">
            {PARTIES_INVOLVED.map((p) => {
              const total = Object.values(partiesCounts).reduce((s, v) => s + v, 0) || 1;
              const count = partiesCounts[p.value] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <li key={p.value}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{p.label}</span>
                    <span className="font-semibold">{count}</span>
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
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          Open data
        </p>
        <h2 className="mt-2 text-4xl font-extrabold">Kenya road crash statistics</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Indicative national figures compiled for public awareness. Roughly thirteen people die on
          Kenyan roads every single day, and most of them are outside a car when it happens.
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
              label: "Deaths per day",
              value: Math.round(latest.fatalities / 365),
              tone: "text-destructive",
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

      <ChartCard
        title="Deaths by month"
        subtitle="Seasonality of road deaths across the most recent year."
      >
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
      </ChartCard>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Main causes of crashes</h2>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={causes}
                  dataKey="share"
                  nameKey="cause"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {causes.map((c, i) => (
                    <Cell key={c.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Deaths by vehicle type</h2>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicles} layout="vertical" margin={{ left: 40 }}>
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
                <Bar dataKey="crashes" name="Crashes" fill="var(--caution)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">When crashes kill</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The evening rush and the hours after dark are the deadliest.
          </p>
          <div className="mt-4 h-80 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bands}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="band" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="fatalities" name="Fatalities" radius={[4, 4, 0, 0]}>
                  {bands.map((b) => (
                    <Cell
                      key={b.id}
                      fill={b.fatalities > 900 ? "var(--destructive)" : "var(--caution)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Deaths by road class</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trunk highways carry the heaviest toll per kilometre.
          </p>
          <div className="mt-4 h-80 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roadClasses} layout="vertical" margin={{ left: 40 }}>
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
          </div>
        </div>
      </section>

      {topRoads.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Most dangerous roads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by fatalities in verified accident reports. Click through to a road's own profile
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
                    <strong>{r.fatalities}</strong> deaths
                  </span>
                  <span className="text-caution">
                    <strong>{r.casualties}</strong> injured
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Counties with the most deaths</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a bar to see reports for that county.
          </p>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counties} layout="vertical" margin={{ left: 24 }}>
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
                  {counties.map((c, i) => (
                    <Cell key={c.id} fill={i === 0 ? "var(--destructive)" : "var(--caution)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Who is dying on our roads</h2>
          <ul className="mt-4 space-y-4">
            {victims.map((v) => {
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
    </div>
  );
}
