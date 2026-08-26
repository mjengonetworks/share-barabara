import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type AppRole, useRoles } from "@/hooks/useRoles";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { UserLink } from "@/components/site/user-link";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users & Roles: Share Barabara Admin" }] }),
  component: UsersAdminPage,
});

const ROLES: AppRole[] = ["member", "guest_author", "author", "moderator", "editor", "admin"];

function UsersAdminPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, county, suspended, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: roleRows = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data;
    },
  });

  const rolesByUser: Record<string, AppRole[]> = {};
  for (const row of roleRows) (rolesByUser[row.user_id] ??= []).push(row.role as AppRole);
  const highestRole = (userId: string): AppRole => {
    const roles = rolesByUser[userId] ?? ["member"];
    return ROLES.reduce((max, r) => (roles.includes(r) ? r : max), "member" as AppRole);
  };

  const { data: subStatus = {} } = useSubscriptionStatuses(profiles.map((p) => p.id));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    queryClient.invalidateQueries({ queryKey: ["subscription-statuses"] });
  };

  const toggleCheckmark = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from("subscriptions")
        .upsert({ user_id: userId, active, tier: "profile" }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.active ? "Checkmark granted" : "Checkmark revoked");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const { error } = await supabase.from("profiles").update({ suspended }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.suspended ? "User suspended" : "Suspension lifted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recommendSuspension = useMutation({
    mutationFn: async () => {
      if (!user || !suspendTarget) throw new Error("Missing target");
      const { error } = await supabase.from("content_requests").insert({
        user_id: user.id,
        entity_type: "profile",
        entity_id: suspendTarget,
        request_type: "suspend",
        message: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sent to editors for approval");
      setSuspendTarget(null);
      setReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = profiles.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.county?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Administration
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Users &amp; roles</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {isAdmin
          ? "Grant or revoke contributor roles, and suspend accounts that break the rules."
          : "Recommend an account for suspension. An editor or admin reviews it in Requests."}
      </p>

      <div className="mt-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username or county"
          className="max-w-sm"
        />
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contributor</TableHead>
              <TableHead>County</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Checkmark</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const isSelf = p.id === user?.id;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <UserLink userId={p.id} name={p.display_name} username={p.username} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.county ?? "—"}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={highestRole(p.id)}
                        disabled={isSelf || setRole.isPending}
                        onValueChange={(v) => setRole.mutate({ userId: p.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="w-40 capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">
                              {r.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {highestRole(p.id).replace("_", " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant={subStatus[p.id] ? "secondary" : "outline"}
                        disabled={toggleCheckmark.isPending}
                        onClick={() =>
                          toggleCheckmark.mutate({ userId: p.id, active: !subStatus[p.id] })
                        }
                        className={subStatus[p.id] ? "text-brand-blue" : ""}
                      >
                        <BadgeCheck className="mr-1 size-4" />
                        {subStatus[p.id] ? "Granted" : "Grant"}
                      </Button>
                    ) : subStatus[p.id] ? (
                      <BadgeCheck className="size-4 text-brand-blue" aria-label="Subscribed" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSelf ? null : isAdmin ? (
                      <Button
                        size="sm"
                        variant={p.suspended ? "outline" : "ghost"}
                        className={p.suspended ? "" : "text-destructive"}
                        disabled={toggleSuspend.isPending}
                        onClick={() =>
                          toggleSuspend.mutate({ userId: p.id, suspended: !p.suspended })
                        }
                      >
                        {p.suspended ? "Lift suspension" : "Suspend"}
                      </Button>
                    ) : !p.suspended ? (
                      <Dialog
                        open={suspendTarget === p.id}
                        onOpenChange={(open) => setSuspendTarget(open ? p.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            Recommend suspension
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Recommend {p.display_name} for suspension</DialogTitle>
                          </DialogHeader>
                          <Textarea
                            rows={4}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why should this account be suspended?"
                          />
                          <Button
                            disabled={reason.trim().length < 3 || recommendSuspension.isPending}
                            onClick={() => recommendSuspension.mutate()}
                          >
                            Send to editors
                          </Button>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
