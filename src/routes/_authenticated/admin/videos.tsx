import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({ meta: [{ title: "Videos: Share Barabara Admin" }] }),
  component: VideosAdminPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  featured: "default",
  pending_review: "secondary",
  rejected: "destructive",
};

function VideosAdminPage() {
  const { canPublishArticles: canModerate } = useRoles();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(
    videos.map((v) => v.user_id).filter((id): id is string => !!id),
  );

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("videos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video updated");
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video deleted");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Videos</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Submitted video links awaiting review. Featuring or rejecting needs editor rank or above.
      </p>
      {!canModerate ? (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Moderators can see submissions but only editors and admins can feature, reject or delete
          someone else's video.
        </p>
      ) : null}

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && videos.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No video submissions yet.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {videos.map((v) => {
          const expanded = expandedId === v.id;
          return (
            <li key={v.id} className="rounded-lg border border-border bg-card card-elevated">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : v.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                  <VideoIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[v.status] ?? "outline"} className="capitalize">
                      {v.status.replace("_", " ")}
                    </Badge>
                    <span className="truncate font-semibold">{v.title}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Submitted by{" "}
                    <UserLink userId={v.user_id} name={v.user_id ? names[v.user_id] : undefined} />{" "}
                    · {timeAgo(v.created_at)}
                  </p>
                </div>
                {expanded ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {expanded ? (
                <div className="border-t border-border p-4">
                  <a
                    href={v.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block break-all text-sm text-brand-blue underline"
                  >
                    {v.video_url}
                  </a>
                  {v.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{v.description}</p>
                  ) : null}
                  {canModerate ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {v.status !== "featured" ? (
                        <Button
                          size="sm"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: v.id, status: "featured" })}
                        >
                          Feature
                        </Button>
                      ) : null}
                      {v.status !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: v.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(v.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
