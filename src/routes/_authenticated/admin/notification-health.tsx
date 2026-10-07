import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, ROLE_RANK } from "@/hooks/useRoles";

export const Route = createFileRoute("/_authenticated/admin/notification-health")({
  head: () => ({ meta: [{ title: "Notification Health: Share Barabara Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotificationHealthPage,
});

function NotificationHealthPage() {
  const { rank, isLoading: rolesLoading } = useRoles();
  const allowed = rank >= ROLE_RANK.admin;
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-notification-health"], enabled: allowed,
    queryFn: async () => {
      const [jobs, attempts, subscriptions] = await Promise.all([
        (supabase.from("notification_delivery_jobs") as any).select("status,created_at,last_attempt_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100),
        (supabase.from("notification_delivery_attempts") as any).select("status,http_status,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100),
        (supabase.from("push_subscriptions") as any).select("status,last_success_at,last_failure_at", { count: "exact" }).limit(100),
      ]);
      const failed = (attempts.data ?? []).filter((row: any) => row.status !== "accepted").length;
      const accepted = (attempts.data ?? []).filter((row: any) => row.status === "accepted").length;
      return { jobs: jobs.data ?? [], attempts: attempts.data ?? [], subscriptions: subscriptions.data ?? [], counts: { jobs: jobs.count ?? 0, attempts: attempts.count ?? 0, accepted, failed, subscriptions: subscriptions.count ?? 0 } };
    },
    staleTime: 30_000,
  });

  if (rolesLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!allowed) return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-xl font-bold">Not authorized</h1><p className="mt-2 text-sm text-muted-foreground">Notification delivery diagnostics are restricted to administrators.</p></div>;
  const counts = data?.counts;
  return <div className="mx-auto max-w-5xl px-4 py-8"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Administration</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Activity className="size-8 text-accent" /> Notification health</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Operational counters only. Push-service acceptance confirms an accepted request, not that a device displayed it. Endpoint keys and payload secrets are never shown here.</p>{error ? <div className="mt-5 rounded border border-destructive/40 p-4 text-sm">Could not read delivery diagnostics. The review-only migration may not be applied yet.</div> : null}{isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading diagnostics…</p> : <><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={Activity} label="Jobs" value={counts?.jobs ?? 0} /><Metric icon={Smartphone} label="Active subscriptions" value={counts?.subscriptions ?? 0} /><Metric icon={CheckCircle2} label="Accepted attempts" value={counts?.accepted ?? 0} /><Metric icon={AlertTriangle} label="Failed attempts" value={counts?.failed ?? 0} /></div><div className="mt-8 rounded-lg border border-border bg-card p-5"><h2 className="font-bold">Recent jobs</h2><ul className="mt-3 divide-y divide-border text-sm">{(data?.jobs ?? []).slice(0, 20).map((job: any) => <li key={job.id} className="flex items-center justify-between gap-3 py-3"><span>{job.status}</span><span className="text-xs text-muted-foreground">{job.last_attempt_at ?? job.created_at}</span></li>)}{!data?.jobs?.length ? <li className="py-3 text-muted-foreground">No push jobs recorded.</li> : null}</ul></div></>}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-card p-4"><Icon className="size-5 text-accent" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>;
}
