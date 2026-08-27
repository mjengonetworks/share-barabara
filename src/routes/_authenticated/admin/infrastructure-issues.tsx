import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Construction,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { dateTime } from "@/lib/format";
import { KENYA_COUNTIES, ROAD_AUTHORITIES, STRUCTURE_TYPES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/infrastructure-issues")({
  head: () => ({ meta: [{ title: "Infrastructure Issues: Share Barabara Admin" }] }),
  component: InfrastructureIssuesAdminPage,
});

type Draft = {
  title: string;
  road_name: string;
  county: string;
  authority: string;
  structure_type: string;
  summary: string;
  content: string;
  editor_note: string;
};
type Status = "pending" | "approved" | "rejected";

function InfrastructureIssuesAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [countyFilter, setCountyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allIssues = [], isLoading } = useQuery({
    queryKey: ["admin-infrastructure-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const issues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIssues.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (countyFilter !== "all" && i.county !== countyFilter) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.road_name.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allIssues, statusFilter, countyFilter, search]);

  const { data: names = {} } = useProfileNames(issues.map((i) => i.user_id));

  const save = useMutation({
    mutationFn: async ({ id, status, draft }: { id: string; status: Status; draft?: Draft }) => {
      const patch = {
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("infrastructure_issues").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Issue updated");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-issues"] });
      queryClient.invalidateQueries({ queryKey: ["infrastructure-issues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("infrastructure_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Issue deleted");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-issues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Infrastructure issues</h1>
      <p className="mt-2 text-muted-foreground">
        Roads, bridges, drainage and signage problems reported by the community.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>County</Label>
          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-40">
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
        </div>
        <div className="min-w-48 flex-1">
          <Label htmlFor="infra-search">Search</Label>
          <Input
            id="infra-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or road…"
          />
        </div>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && issues.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing matches these filters.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {issues.map((i) => {
          const d: Draft = drafts[i.id] ?? {
            title: i.title,
            road_name: i.road_name,
            county: i.county ?? "",
            authority: i.authority ?? "",
            structure_type: i.structure_type,
            summary: i.summary,
            content: i.content,
            editor_note: i.editor_note ?? "",
          };
          const set = (patch: Partial<Draft>) =>
            setDrafts((prev) => ({ ...prev, [i.id]: { ...d, ...patch } }));
          const expanded = expandedId === i.id;

          return (
            <li key={i.id} className="rounded-lg border border-border bg-card card-elevated">
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : i.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {i.image_url ? (
                    <img
                      src={i.image_url}
                      alt=""
                      className="size-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                      <Construction className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {i.road_name}
                      {i.county ? ` · ${i.county}` : ""} · by{" "}
                      <UserLink userId={i.user_id} name={names[i.user_id]} /> ·{" "}
                      {dateTime(i.created_at)}
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {i.status === "approved" ? (
                      <DropdownMenuItem asChild>
                        <Link
                          to="/infrastructure-issues/$issueId"
                          params={{ issueId: i.id }}
                          target="_blank"
                        >
                          <ExternalLink className="mr-2 size-4" /> View on website
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => setExpandedId(i.id)}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </DropdownMenuItem>
                    {i.status !== "approved" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: i.id, status: "approved" })}
                      >
                        Approve &amp; publish
                      </DropdownMenuItem>
                    ) : null}
                    {i.status !== "rejected" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: i.id, status: "rejected" })}
                      >
                        Reject
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => remove.mutate(i.id)}
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  aria-label={expanded ? "Collapse" : "Expand"}
                  onClick={() => setExpandedId(expanded ? null : i.id)}
                  className="shrink-0 text-muted-foreground"
                >
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>

              {expanded ? (
                <div className="border-t border-border p-5">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`t-${i.id}`}>Issue title</Label>
                      <Input
                        id={`t-${i.id}`}
                        value={d.title}
                        onChange={(e) => set({ title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`r-${i.id}`}>Road name</Label>
                        <Input
                          id={`r-${i.id}`}
                          value={d.road_name}
                          onChange={(e) => set({ road_name: e.target.value })}
                        />
                      </div>
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
                        <Label>Authority</Label>
                        <Select value={d.authority} onValueChange={(v) => set({ authority: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROAD_AUTHORITIES.map((a) => (
                              <SelectItem key={a.value} value={a.value}>
                                {a.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Structure type</Label>
                        <Select
                          value={d.structure_type}
                          onValueChange={(v) => set({ structure_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STRUCTURE_TYPES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`s-${i.id}`}>Summary</Label>
                      <RichTextEditor
                        id={`s-${i.id}`}
                        rows={2}
                        value={d.summary}
                        onChange={(v) => set({ summary: v })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`c-${i.id}`}>Content</Label>
                      <RichTextEditor
                        id={`c-${i.id}`}
                        rows={6}
                        value={d.content}
                        onChange={(v) => set({ content: v })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`n-${i.id}`}>Moderator's note (shown publicly)</Label>
                      <Input
                        id={`n-${i.id}`}
                        value={d.editor_note}
                        onChange={(e) => set({ editor_note: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: i.id, status: "approved", draft: d })}
                    >
                      Approve &amp; publish
                    </Button>
                    <Button
                      variant="outline"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({ id: i.id, status: i.status as Status, draft: d })
                      }
                    >
                      Save edits
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: i.id, status: "rejected", draft: d })}
                    >
                      Reject
                    </Button>
                    {i.status !== "pending" ? (
                      <Button
                        variant="ghost"
                        disabled={save.isPending}
                        onClick={() => save.mutate({ id: i.id, status: "pending" })}
                      >
                        Send back to pending
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
