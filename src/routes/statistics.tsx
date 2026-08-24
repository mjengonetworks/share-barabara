import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Kenya Road Crash Statistics — Share Barabara" },
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
        Open data
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Kenya road crash statistics</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Indicative national figures compiled for public awareness. Roughly thirteen
        people die on Kenyan roads every single day, and most of them are outside a
        car when it happens.
      </p>

      {latest ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: `Deaths in ${latest.year}`, value: num(latest.fatalities), tone: "text-destructive" },
            { label: "Serious injuries", value: num(latest.serious_injuries), tone: "text-caution" },
            { label: "Recorded crashes", value: num(latest.crashes), tone: "text-foreground" },
            {
              label: "Deaths per 100,000 people",
              value: latest.deaths_per_100k ?? "—",
              tone: "text-foreground",
            },
            {
              label: "Registered vehicles",
              value: latest.registered_vehicles ? num(latest.registered_vehicles) : "—",
              tone: "text-foreground",
            },
            { label: "Slight injuries", value: num(latest.slight_injuries), tone: "text-foreground" },
            {
              label: "Deaths per day",
              value: Math.round(latest.fatalities / 365),
              tone: "text-destructive",
            },
            {
              label: "Change vs previous year",
              value: yoy === null ? "—" : `${yoy > 0 ? "+" : ""}${yoy}%`,
              tone: yoy !== null && yoy > 0 ? "text-destructive" : "text-safe",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-6 card-elevated">
              <p className={`font-display text-3xl font-extrabold ${s.tone}`}>{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <ChartCard title="Deaths and injuries by year">
        <LineChart data={yearly}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="fatalities" name="Fatalities" stroke="var(--destructive)" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="serious_injuries" name="Serious injuries" stroke="var(--caution)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="slight_injuries" name="Slight injuries" stroke="var(--muted-foreground)" strokeWidth={2} dot={false} />
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
          <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="registered_vehicles" name="Registered vehicles" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
          <Area yAxisId="right" type="monotone" dataKey="deaths_per_100k" name="Deaths per 100k" stroke="var(--destructive)" fill="var(--destructive)" fillOpacity={0.2} />
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
          <Bar dataKey="fatalities" name="Fatalities" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
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
                <YAxis type="category" dataKey="vehicle_type" width={140} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="fatalities" name="Fatalities" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
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
                    <Cell key={b.id} fill={b.fatalities > 900 ? "var(--destructive)" : "var(--caution)"} />
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
                <YAxis type="category" dataKey="road_class" width={150} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="fatalities" name="Fatalities" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Counties with the most deaths</h2>
          <div className="mt-4 h-96 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counties} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="county" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="fatalities" name="Fatalities" radius={[0, 4, 4, 0]}>
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
            Vulnerable road users — pedestrians, motorcyclists and their pillion
            passengers — make up the large majority of deaths. Speed management,
            helmets, footpaths and lighting are the interventions that shift these
            numbers.
          </p>
        </div>
      </section>
    </div>
  );
}
