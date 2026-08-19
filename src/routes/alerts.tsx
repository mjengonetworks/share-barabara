import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { timeAgo } from "@/lib/format";
import { HAZARD_TYPES, KENYA_COUNTIES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { AlertForm } from "@/components/site/alert-form";
import { CommentSection } from "@/components/site/comment-section";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Live Road Hazard Alerts in Kenya — Share Barabara" },
      {
        name: "description",
        content:
          "Community-reported road hazards across Kenya: crashes, flooding, potholes, obstructions and reckless driving, filtered by county.",
      },
      { property: "og:title", content: "Live Road Hazard Alerts in Kenya" },
      {
        property: "og:description",
        content: "See what Kenyan drivers, riders and passengers are reporting on the road right now.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { user } = useAuth();
  const [county, setCounty] = useState("all");
  const [hazard, setHazard] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(alerts.map((a) => a.user_id));

  const visible = alerts.filter(
    (a) =>
      (county === "all" || a.county === county) &&
      (hazard === "all" || a.hazard_type === hazard),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Live feed
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">Road hazard alerts</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Hazards reported by road users across the 47 counties. Check before you
            travel, and add what you see on your route.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap gap-3">
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All counties</SelectItem>
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hazard} onValueChange={setHazard}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hazard types</SelectItem>
                {HAZARD_TYPES.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <p className="mt-8 text-muted-foreground">Loading alerts…</p> : null}
          {!isLoading && visible.length === 0 ? (
            <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
              No alerts match this filter yet.
            </p>
          ) : null}

          <ul className="mt-6 space-y-4">
            {visible.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
                <div className="flex flex-wrap items-center gap-2">
                  <TriangleAlert className="size-4 text-caution" />
                  <SeverityBadge value={a.severity} />
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {HAZARD_TYPES.find((h) => h.value === a.hazard_type)?.label ?? a.hazard_type}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold">{a.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" /> {a.county}
                  {a.road ? ` · ${a.road}` : ""} · by {names[a.user_id] ?? "Road user"}
                </p>
                <p className="mt-3 text-sm text-foreground/90">{a.description}</p>
                <button
                  className="mt-3 text-sm font-semibold text-accent-foreground underline"
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                >
                  {openId === a.id ? "Hide discussion" : "Discussion"}
                </button>
                {openId === a.id ? <CommentSection entityType="alert" entityId={a.id} /> : null}
              </li>
            ))}
          </ul>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Report a hazard</h2>
          {user ? (
            <div className="mt-4">
              <AlertForm />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to publish an alert. Never use your phone while driving —
                stop safely first, or ask a passenger to report.
              </p>
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in to report</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}