import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { UserLink } from "@/components/site/user-link";
import { longDate } from "@/lib/format";
import { KENYA_COUNTIES, REPORT_SEVERITIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Accident Reports: Share Barabara Admin" }] }),
  component: ReportsQueuePage,
});

type ReportDraft = {
  title: string;
  description: string;
  county: string;
  road: string;
  severity: string;
  vehicles_involved: number;
  casualties: number;
  fatalities: number;
  editor_note: string;
};

function ReportsQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(reports.map((r) => r.user_id));

  const save = useMutation({
    mutationFn: async ({
      id,
      status,
      draft,
    }: {
      id: string;
      status: "approved" | "rejected" | "pending";
      draft?: ReportDraft;
    }) => {
      const patch = {
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("accident_reports").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Accident reports</h1>
      <p className="mt-2 text-muted-foreground">
        Edit submissions for accuracy and clarity, then approve them.
      </p>

      <div className="mt-6 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && reports.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing {tab} right now.
        </p>
      ) : null}

      <ul className="mt-6 space-y-6">
        {reports.map((r) => {
          const d: ReportDraft = drafts[r.id] ?? {
            title: r.title,
            description: r.description,
            county: r.county,
            road: r.road ?? "",
            severity: r.severity,
            vehicles_involved: r.vehicles_involved,
            casualties: r.casualties,
            fatalities: r.fatalities,
            editor_note: r.editor_note ?? "",
          };
          const set = (patch: Partial<ReportDraft>) =>
            setDrafts((prev) => ({ ...prev, [r.id]: { ...d, ...patch } }));

          return (
            <li key={r.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
              <p className="text-xs text-muted-foreground">
                Filed by <UserLink userId={r.user_id} name={names[r.user_id]} /> ·{" "}
                {longDate(r.occurred_at)}
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor={`t-${r.id}`}>Summary</Label>
                  <Input
                    id={`t-${r.id}`}
                    value={d.title}
                    onChange={(e) => set({ title: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>County</Label>
                    <Select value={d.county} onValueChange={(v) => set({ county: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {KENYA_COUNTIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`rd-${r.id}`}>Road or location</Label>
                    <Input
                      id={`rd-${r.id}`}
                      value={d.road}
                      onChange={(e) => set({ road: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={d.severity} onValueChange={(v) => set({ severity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_SEVERITIES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`v-${r.id}`}>Vehicles</Label>
                      <Input
                        id={`v-${r.id}`}
                        type="number"
                        min={0}
                        value={d.vehicles_involved}
                        onChange={(e) => set({ vehicles_involved: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`i-${r.id}`}>Injured</Label>
                      <Input
                        id={`i-${r.id}`}
                        type="number"
                        min={0}
                        value={d.casualties}
                        onChange={(e) => set({ casualties: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`f-${r.id}`}>Deaths</Label>
                      <Input
                        id={`f-${r.id}`}
                        type="number"
                        min={0}
                        value={d.fatalities}
                        onChange={(e) => set({ fatalities: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`d-${r.id}`}>Report body</Label>
                  <Textarea
                    id={`d-${r.id}`}
                    rows={5}
                    value={d.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`n-${r.id}`}>Editor's note (shown publicly)</Label>
                  <Textarea
                    id={`n-${r.id}`}
                    rows={2}
                    value={d.editor_note}
                    onChange={(e) => set({ editor_note: e.target.value })}
                    placeholder="Verification details, corrections or context added during review."
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: "approved", draft: d })}
                >
                  Approve &amp; publish
                </Button>
                <Button
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: r.status as never, draft: d })}
                >
                  Save edits
                </Button>
                <Button
                  variant="destructive"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: "rejected", draft: d })}
                >
                  Reject
                </Button>
                {r.status !== "pending" ? (
                  <Button
                    variant="ghost"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ id: r.id, status: "pending" })}
                  >
                    Send back to pending
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
