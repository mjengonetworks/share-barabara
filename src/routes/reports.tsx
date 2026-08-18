import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CarFront, MapPin } from "lucide-react";
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
import { longDate } from "@/lib/format";
import { KENYA_COUNTIES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { ReportForm } from "@/components/site/report-form";
import { CommentSection } from "@/components/site/comment-section";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Accident Reports from Kenyan Roads — Barabara Salama" },
      {
        name: "description",
        content:
          "Community accident reports from across Kenya with location, vehicles involved, casualties and contributing factors.",
      },
      { property: "og:title", content: "Accident Reports from Kenyan Roads" },
      {
        property: "og:description",
        content: "Structured crash reports filed by Kenyan road users, open for discussion.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const [county, setCounty] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(reports.map((r) => r.user_id));
  const visible = reports.filter((r) => county === "all" || r.county === county);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Crash record
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Accident reports</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Detailed crash reports filed by the community. These records help identify
        recurring black spots and dangerous stretches long before official data is
        published.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Select value={county} onValueChange={setCounty}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All counties</SelectItem>
              {KENYA_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? <p className="mt-8 text-muted-foreground">Loading reports…</p> : null}
          {!isLoading && visible.length === 0 ? (
            <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
              No reports filed for this filter yet.
            </p>
          ) : null}

          <ul className="mt-6 space-y-4">
            {visible.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
                <div className="flex flex-wrap items-center gap-2">
                  <CarFront className="size-4 text-muted-foreground" />
                  <SeverityBadge value={r.severity} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(r.occurred_at)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold">{r.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" /> {r.county}
                  {r.road ? ` · ${r.road}` : ""} · by {names[r.user_id] ?? "Road user"}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span><strong>{r.vehicles_involved}</strong> vehicles</span>
                  <span><strong>{r.casualties}</strong> injured</span>
                  <span className="text-destructive"><strong>{r.fatalities}</strong> deaths</span>
                </div>
                <p className="mt-3 text-sm text-foreground/90">{r.description}</p>
                <button
                  className="mt-3 text-sm font-semibold text-accent-foreground underline"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  {openId === r.id ? "Hide discussion" : "Discussion"}
                </button>
                {openId === r.id ? <CommentSection entityType="report" entityId={r.id} /> : null}
              </li>
            ))}
          </ul>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">File a report</h2>
          {user ? (
            <div className="mt-4">
              <ReportForm />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to file an accident report. Call 999 or 112 first if anyone
                is injured.
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