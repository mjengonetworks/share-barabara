import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/crash-statistics")({
  head: () => ({ meta: [{ title: "Crash Statistics: Share Barabara Admin" }] }),
  component: CrashStatisticsPage,
});

type ColumnDef = { key: string; label: string; type: "text" | "number"; step?: string };
type TableName =
  | "yearly_stats"
  | "county_stats"
  | "victim_stats"
  | "monthly_stats"
  | "cause_stats"
  | "vehicle_stats"
  | "time_of_day_stats"
  | "road_class_stats";

type TabDef = {
  table: TableName;
  queryKey: string;
  orderBy: string;
  columns: ColumnDef[];
};

const TABS: Record<string, TabDef> = {
  yearly: {
    table: "yearly_stats",
    queryKey: "admin-yearly-stats",
    orderBy: "year",
    columns: [
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
      { key: "serious_injuries", label: "Serious injuries", type: "number" },
      { key: "slight_injuries", label: "Slight injuries", type: "number" },
      { key: "crashes", label: "Crashes", type: "number" },
      { key: "registered_vehicles", label: "Registered vehicles", type: "number" },
      { key: "deaths_per_100k", label: "Deaths / 100k", type: "number", step: "0.1" },
    ],
  },
  monthly: {
    table: "monthly_stats",
    queryKey: "admin-monthly-stats",
    orderBy: "year",
    columns: [
      { key: "year", label: "Year", type: "number" },
      { key: "month", label: "Month (1-12)", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
      { key: "crashes", label: "Crashes", type: "number" },
    ],
  },
  county: {
    table: "county_stats",
    queryKey: "admin-county-stats",
    orderBy: "fatalities",
    columns: [
      { key: "county", label: "County", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
      { key: "crashes", label: "Crashes", type: "number" },
      { key: "serious_injuries", label: "Serious injuries", type: "number" },
      { key: "population", label: "Population", type: "number" },
    ],
  },
  victim: {
    table: "victim_stats",
    queryKey: "admin-victim-stats",
    orderBy: "fatalities",
    columns: [
      { key: "category", label: "Category", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
    ],
  },
  cause: {
    table: "cause_stats",
    queryKey: "admin-cause-stats",
    orderBy: "fatalities",
    columns: [
      { key: "cause", label: "Cause", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
      { key: "share", label: "Share (%)", type: "number", step: "0.1" },
    ],
  },
  vehicle: {
    table: "vehicle_stats",
    queryKey: "admin-vehicle-stats",
    orderBy: "fatalities",
    columns: [
      { key: "vehicle_type", label: "Vehicle type", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "crashes", label: "Crashes", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
    ],
  },
  timeofday: {
    table: "time_of_day_stats",
    queryKey: "admin-time-of-day-stats",
    orderBy: "sort_order",
    columns: [
      { key: "band", label: "Time band", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
    ],
  },
  roadclass: {
    table: "road_class_stats",
    queryKey: "admin-road-class-stats",
    orderBy: "fatalities",
    columns: [
      { key: "road_class", label: "Road class", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "fatalities", label: "Fatalities", type: "number" },
      { key: "crashes", label: "Crashes", type: "number" },
    ],
  },
};

function emptyRow(columns: ColumnDef[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const c of columns) row[c.key] = "";
  return row;
}

function StatsTableEditor({ table, queryKey, orderBy, columns }: TabDef) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>(emptyRow(columns));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return data as Record<string, string | number>[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    queryClient.invalidateQueries({ queryKey: ["statistics", table] });
  };

  const toPayload = (values: Record<string, string>) => {
    const payload: Record<string, string | number> = {};
    for (const c of columns) {
      const v = values[c.key] ?? "";
      if (c.type === "number") {
        if (v.trim() === "") continue;
        payload[c.key] = Number(v);
      } else {
        payload[c.key] = v.trim();
      }
    }
    return payload;
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table as never).insert(toPayload(draft) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Row added");
      setDraft(emptyRow(columns));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      key,
      value,
      type,
    }: {
      id: string;
      key: string;
      value: string;
      type: string;
    }) => {
      const payload = { [key]: type === "number" ? Number(value) : value };
      const { error } = await supabase
        .from(table as never)
        .update(payload as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Row removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
        {columns.map((c) => (
          <div key={c.key}>
            <label className="text-xs text-muted-foreground">{c.label}</label>
            <Input
              type={c.type === "number" ? "number" : "text"}
              step={c.step}
              value={draft[c.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
              className="h-8 w-32"
            />
          </div>
        ))}
        <Button size="sm" disabled={add.isPending} onClick={() => add.mutate()}>
          Add row
        </Button>
      </div>

      {isLoading ? <p className="mt-4 text-muted-foreground">Loading…</p> : null}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                  {c.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row["id"] as string}>
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-1.5">
                    <Input
                      type={c.type === "number" ? "number" : "text"}
                      step={c.step}
                      defaultValue={String(row[c.key] ?? "")}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== String(row[c.key] ?? "")) {
                          update.mutate({
                            id: row["id"] as string,
                            key: c.key,
                            value: v,
                            type: c.type,
                          });
                        }
                      }}
                      className="h-8 w-28"
                    />
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(row["id"] as string)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No rows yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function CrashStatisticsPage() {
  return (
    <div className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-[1.3125rem] font-extrabold">Crash statistics</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Feeds every chart on the public Statistics page. Alerts and accident reports already
        populate their own live counts automatically — this is for the aggregate national/county
        figures (ours, or from official sources) that don't come from user submissions.
      </p>

      <Tabs defaultValue="yearly" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="county">County</TabsTrigger>
          <TabsTrigger value="victim">Victim category</TabsTrigger>
          <TabsTrigger value="cause">Cause</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle type</TabsTrigger>
          <TabsTrigger value="timeofday">Time of day</TabsTrigger>
          <TabsTrigger value="roadclass">Road class</TabsTrigger>
        </TabsList>
        {Object.entries(TABS).map(([key, def]) => (
          <TabsContent key={key} value={key}>
            <StatsTableEditor {...def} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
