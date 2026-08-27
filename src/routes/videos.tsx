import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Film, PlayCircle, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { youtubeId } from "@/lib/video";
import { roleRank, useRoleLabels, ROLE_RANK } from "@/hooks/useRoles";
import { UserLink } from "@/components/site/user-link";
import { BannerAd } from "@/components/site/banner-ad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Videos: Share Barabara" },
      {
        name: "description",
        content:
          "Road safety videos from Mjengo Hub and the Share Barabara community, curated for the Share Barabara culture.",
      },
    ],
  }),
  component: VideosPage,
});

const MJENGO_HUB_PLAYLISTS = [
  { label: "Road safety", playlistId: "PLpAk4V2d6pRfLs4YSIo85O_O8WADh3IUW" },
  { label: "Infrastructure", playlistId: "PLpAk4V2d6pRf-aEGbEiuxcVZI5u6I87O8" },
];

function PlaylistEmbed({ label, playlistId }: { label: string; playlistId: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{label}</h3>
      <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border">
        <iframe
          className="size-full"
          src={`https://www.youtube.com/embed/videoseries?list=${playlistId}`}
          title={`Mjengo Hub: ${label} playlist`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

type VideoCard = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  user_id: string | null;
};

function VideoGrid({ videos, names }: { videos: VideoCard[]; names: Record<string, string> }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {videos.map((v) => {
        const yt = youtubeId(v.video_url);
        return (
          <article key={v.id} className="rounded-lg border border-border bg-card p-4 card-elevated">
            {yt ? (
              <div className="aspect-video overflow-hidden rounded">
                <iframe
                  className="size-full"
                  src={`https://www.youtube.com/embed/${yt}`}
                  title={v.title}
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={v.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-video items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground"
              >
                <PlayCircle className="size-10" />
              </a>
            )}
            <h2 className="mt-3 font-bold">{v.title}</h2>
            {v.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted by{" "}
              <UserLink userId={v.user_id} name={v.user_id ? names[v.user_id] : undefined} />
            </p>
          </article>
        );
      })}
    </div>
  );
}

function VideosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", video_url: "" });

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("status", "featured")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const submitterIds = videos.map((v) => v.user_id).filter((id): id is string => !!id);
  const { data: names = {} } = useProfileNames(submitterIds);
  const { data: roleMap = {} } = useRoleLabels(submitterIds);

  const adminVideos = videos.filter(
    (v) => v.user_id && roleRank(roleMap[v.user_id] ?? []) >= ROLE_RANK.moderator,
  );
  const communityVideos = videos.filter(
    (v) => !v.user_id || roleRank(roleMap[v.user_id] ?? []) < ROLE_RANK.moderator,
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("videos").insert({ ...form, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video submitted, an editor will review it before it is featured");
      setForm({ title: "", description: "", video_url: "" });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Watch
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Road safety videos</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Videos promoting road safety and the Share Barabara culture, from Mjengo Hub and curated
        from the community.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Film className="size-6 text-accent" /> Mjengo Hub playlists
            </h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {MJENGO_HUB_PLAYLISTS.map((p) => (
                <PlaylistEmbed key={p.playlistId} label={p.label} playlistId={p.playlistId} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="size-6 text-accent" /> From our admins
            </h2>
            {isLoading ? <p className="mt-4 text-muted-foreground">Loading videos…</p> : null}
            {!isLoading && adminVideos.length === 0 ? (
              <p className="mt-4 rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No staff-submitted videos yet.
              </p>
            ) : (
              <div className="mt-5">
                <VideoGrid videos={adminVideos} names={names} />
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="size-6 text-accent" /> From our community
            </h2>
            {!isLoading && communityVideos.length === 0 ? (
              <p className="mt-4 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
                <Film className="mx-auto mb-2 size-8 text-muted-foreground" />
                No videos featured yet. Be the first to submit one.
              </p>
            ) : (
              <div className="mt-5">
                <VideoGrid videos={communityVideos} names={names} />
              </div>
            )}
          </section>

          {videos.length > 0 ? (
            <div className="mt-8">
              <BannerAd />
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Submit a video</h2>
          {user ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <div>
                <Label htmlFor="v-title">Title</Label>
                <Input
                  id="v-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="v-url">Video link (YouTube, TikTok, etc.)</Label>
                <Input
                  id="v-url"
                  required
                  type="url"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div>
                <Label htmlFor="v-desc">Description (optional)</Label>
                <Textarea
                  id="v-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit for review"}
              </Button>
            </form>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Sign in to submit a video.</p>
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
