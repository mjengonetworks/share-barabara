import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
          "Road crash statistics for Kenya: yearly fatalities and injuries, deaths by county and by road user category including pedestrians and motorcyclists.",
      },
      { property: "og:title", content: "Kenya Road Crash Statistics" },
      {
        property: "og:description",
        content: "Yearly fatalities, county hotspots and the road users most at risk in Kenya.",
      },
    ],
  }),
  component: StatisticsPage,
});

function StatisticsPage() {
  const { data: yearly = [] } = useQuery({
    queryKey: ["yearly_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yearly_stats")
        .select("*")
        .order("year");
      if (error) throw error;
      return data;
    },
  });

  const { data: counties = [] } = useQuery({
    queryKey: ["county_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("county_stats")
        .select("*")
        .order("fatalities", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: victims = [] } = useQuery({
    queryKey: ["victim_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("victim_stats")
        .select("*")
        .order("fatalities", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latest = yearly[yearly.length - 1];
  const totalVictims = victims.reduce((sum, v) => sum + v.fatalities, 0) || 1;

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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: `Deaths in ${latest.year}`, value: latest.fatalities, tone: "text-destructive" },
            { label: "Serious injuries", value: latest.serious_injuries, tone: "text-caution" },
            { label: "Slight injuries", value: latest.slight_injuries, tone: "text-foreground" },
            { label: "Recorded crashes", value: latest.crashes, tone: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-6 card-elevated">
              <p className={`font-display text-4xl font-extrabold ${s.tone}`}>{num(s.value)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Deaths and injuries by year</h2>
        <div className="mt-6 h-80 rounded-lg border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}
              />
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Counties with the most deaths</h2>
          <div className="mt-6 h-96 rounded-lg border border-border bg-card p-4">
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
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                />
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
          <ul className="mt-6 space-y-4">
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