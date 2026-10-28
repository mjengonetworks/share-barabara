import { Fragment, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Filter,
  Hash,
  Image,
  Link2,
  MessageSquare,
  PhoneCall,
  Pencil,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { useVotes } from "@/hooks/useVotes";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoteButtons } from "@/components/site/vote-buttons";
import { CommentSection } from "@/components/site/comment-section";
import { UserLink } from "@/components/site/user-link";
import { timeAgo } from "@/lib/format";
import {
  extractFeedHashtags,
  FEED_LIMIT,
  feedSort,
  normalizeFeedBody,
  trendCounts,
} from "@/lib/feed.mjs";
import { createFeedPost } from "@/lib/feed.functions";
import { getFeedMediaSignedUrls } from "@/lib/feed-media.functions";
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { EditorialDiscoveryRail } from "@/components/site/editorial-discovery";
import { SocialFollowSection } from "@/components/site/social-follow-section";
import { youtubeId } from "@/lib/video";
import { BannerAd } from "@/components/site/banner-ad";
import { uploadFeedMediaAsset } from "@/lib/storage";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Media & Feed: Share Barabara" },
      {
        name: "description",
        content:
          "Community conversations, public media and infrastructure updates from Share Barabara and clearly attributed sources.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    sort: search.sort === "top" || search.sort === "hot" ? search.sort : "new",
    view:
      search.view === "following" || search.view === "trending" || search.view === "topics" || search.view === "discussions"
        ? search.view
        : "for_you",
    q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
    type: typeof search.type === "string" ? search.type.slice(0, 32) : "",
  }),
  component: FeedPage,
});

type Post = {
  id: string;
  author_id: string;
  body: string;
  hashtags: string[];
  status: string;
  moderation_status: string;
  created_at: string;
  published_at: string | null;
  score?: number;
  comment_count?: number;
  media?: Array<{ id: string; media_type: "image" | "video"; storage_path: string; filename: string }>;
};
type AutoItem = {
  id: string;
  kind: "alert" | "report" | "article" | "campaign" | "infrastructure";
  title: string;
  body: string;
  created_at: string;
  location?: string | null;
  href: string;
  rank?: number;
};

type TimelineItem =
  | { kind: "community"; id: string; created_at: string; post: Post }
  | { kind: "editorial"; id: string; created_at: string; item: AutoItem };
type MediaItem = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  created_at: string;
};

function FeedPage() {
  const { user } = useAuth();
  const { rank } = useRoles();
  const queryClient = useQueryClient();
  const { sort = "new", view = "for_you", q = "", type = "" } = Route.useSearch();
  const [body, setBody] = useState("");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    data: posts = [],
    isLoading,
    error: feedError,
  } = useQuery<Post[]>({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("feed_posts") as any)
        .select("id,author_id,body,hashtags,status,moderation_status,created_at,published_at")
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);
      if (error) {
        const setupError = error.code === "42P01" || error.code === "PGRST205";
        throw new Error(
          setupError
            ? "Feed storage is not enabled yet."
            : "The community Feed is temporarily unavailable.",
        );
      }
      return (data ?? []) as Post[];
    },
    staleTime: 30_000,
  });

  const { data: automatic = [] } = useQuery<AutoItem[]>({
    queryKey: ["feed-automatic-content"],
    queryFn: async () => {
      const [alerts, reports, articles, campaigns, infrastructure] = await Promise.all([
        supabase
          .from("alerts")
          .select("id,title,description,county,road,created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("accident_reports")
          .select("id,title,description,county,road,occurred_at")
          .eq("status", "approved")
          .order("occurred_at", { ascending: false })
          .limit(8),
        supabase
          .from("news")
          .select("id,slug,title,summary,published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(8),
        supabase
          .from("campaigns")
          .select("id,slug,title,description,start_date")
          .order("start_date", { ascending: false })
          .limit(8),
        supabase
          .from("infrastructure_issues")
          .select("id,title,summary,road_name,created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return [
        ...(alerts.data ?? []).map((item) => ({
          id: item.id,
          kind: "alert" as const,
          title: item.title,
          body: item.description ?? "",
          location: [item.county, item.road].filter(Boolean).join(" · "),
          created_at: item.created_at,
          href: `/alerts/${item.id}`,
        })),
        ...(reports.data ?? []).map((item) => ({
          id: item.id,
          kind: "report" as const,
          title: item.title,
          body: item.description ?? "",
          location: [item.county, item.road].filter(Boolean).join(" · "),
          created_at: item.occurred_at,
          href: `/reports/${item.id}`,
        })),
        ...(articles.data ?? []).map((item) => ({
          id: item.id,
          kind: "article" as const,
          title: item.title,
          body: item.summary ?? "",
          created_at: item.published_at,
          href: `/news/${item.slug}`,
        })),
        ...(campaigns.data ?? []).map((item) => ({
          id: item.id,
          kind: "campaign" as const,
          title: item.title,
          body: item.description ?? "",
          location: null,
          created_at: item.start_date,
          href: `/campaigns/${item.slug}`,
        })),
        ...(infrastructure.data ?? []).map((item) => ({
          id: item.id,
          kind: "infrastructure" as const,
          title: item.title,
          body: item.summary ?? "",
          location: item.road_name,
          created_at: item.created_at,
          href: `/infrastructure-issues/${item.id}`,
        })),
      ]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 12);
    },
    staleTime: 60_000,
  });
  const { data: trendingEditorial = [] } = useQuery<AutoItem[]>({
    queryKey: ["feed-trending-editorial"],
    enabled: view === "trending",
    queryFn: async () => {
      const [articles, alerts, reports] = await Promise.all([
        (supabase.rpc("trending_news", { hours_back: 168, result_limit: 8 }) as any),
        (supabase.rpc("trending_alerts", { hours_back: 168, result_limit: 8 }) as any),
        (supabase.rpc("trending_reports", { hours_back: 168, result_limit: 8 }) as any),
      ]);
      if (articles.error || alerts.error || reports.error) return [];
      return [
        ...(articles.data ?? []).map((item: any, index: number) => ({ id: item.id, kind: "article" as const, title: item.title, body: item.summary ?? "", created_at: item.published_at, href: `/news/${item.slug}`, rank: index })),
        ...(alerts.data ?? []).map((item: any, index: number) => ({ id: item.id, kind: "alert" as const, title: item.title, body: item.description ?? "", created_at: item.created_at, href: `/alerts/${item.id}`, rank: index })),
        ...(reports.data ?? []).map((item: any, index: number) => ({ id: item.id, kind: "report" as const, title: item.title, body: item.description ?? "", created_at: item.occurred_at, href: `/reports/${item.id}`, rank: index })),
      ];
    },
    staleTime: 60_000,
  });
  const { data: media = [] } = useQuery<MediaItem[]>({
    queryKey: ["feed-featured-media"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("videos") as any)
        .select("id,title,description,video_url,created_at")
        .eq("status", "featured")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return [];
        throw error;
      }
      return (data ?? []) as MediaItem[];
    },
    staleTime: 60_000,
  });

  const postIds = posts.map((post) => post.id);
  const { scores, vote } = useVotes("feed_post", postIds);
  const { data: commentRows = [] } = useQuery<{ entity_id: string }[]>({
    queryKey: ["feed-comment-counts", postIds],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("comments") as any)
        .select("entity_id")
        .eq("entity_type", "feed_post")
        .in("entity_id", postIds);
      return (data ?? []) as { entity_id: string }[];
    },
  });
  const { data: mediaRows = [] } = useQuery<{ id: string; post_id: string; media_type: "image" | "video"; storage_path: string; filename: string }[]>({
    queryKey: ["feed-post-media", postIds],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("feed_post_media") as any).select("id,post_id,media_type,storage_path,filename").in("post_id", postIds);
      return (data ?? []) as { id: string; post_id: string; media_type: "image" | "video"; storage_path: string; filename: string }[];
    },
  });
  const mediaIds = mediaRows.map((media) => media.id);
  const { data: signedMedia = {} } = useQuery<Record<string, { signed_url: string }>>({
    queryKey: ["feed-post-media-signed", mediaIds],
    enabled: mediaIds.length > 0,
    queryFn: async () => (await getFeedMediaSignedUrls({ data: { mediaIds } })) as Record<string, { signed_url: string }>,
    staleTime: 10 * 60 * 1000,
  });
  const { data: mediaAttachmentsEnabled = false } = useQuery({
    queryKey: ["feed-post-media-capability"],
    queryFn: async () => {
      const { error } = await (supabase.from("feed_post_media") as any).select("id").limit(1);
      return !error;
    },
    staleTime: 300_000,
  });
  const enriched = posts.map((post) => ({
    ...post,
    score: scores[post.id]?.net ?? 0,
    comment_count: commentRows.filter((comment) => comment.entity_id === post.id).length,
    media: mediaRows.filter((media) => media.post_id === post.id),
  }));
  const sortedPosts = feedSort(enriched, view === "trending" ? "hot" : sort);
  const allNamesIds = sortedPosts.map((post) => post.author_id);
  const { data: names = {} } = useProfileNames(allNamesIds);
  const { data: usernames = {} } = useProfileUsernames(allNamesIds);
  const { data: verified = {} } = useSubscriptionStatuses(allNamesIds);
  const trends = trendCounts(posts);
  const { data: blockedRows = [] } = useQuery<{ blocked_id: string }[]>({
    queryKey: ["feed-blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from("feed_blocks") as any)
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      return (data ?? []) as { blocked_id: string }[];
    },
    staleTime: 30_000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to post");
      const clean = normalizeFeedBody(body);
      if (clean.length < 3) throw new Error("Write at least three characters");
      const media: Array<{ media_type: "image" | "video"; storage_path: string; filename: string; mime_type: string; bytes: number }> = [];
      const uploadedPaths: string[] = [];
      try {
        if (mediaAttachmentsEnabled) {
          for (const file of attachments) {
            const uploaded = await uploadFeedMediaAsset(file, user.id);
            uploadedPaths.push(uploaded.storagePath);
            media.push({ media_type: file.type.startsWith("video/") ? "video" : "image", storage_path: uploaded.storagePath, filename: file.name, mime_type: file.type, bytes: file.size });
          }
        }
        await createFeedPost({ data: { body: clean, media } });
      } catch (error) {
        if (uploadedPaths.length) await supabase.storage.from("feed-media").remove(uploadedPaths);
        throw error;
      }
    },
    onSuccess: (result) => {
      setBody("");
      setAttachments([]);
      toast.success(result.status === "published" ? "Posted to the community Feed" : "Held for a safety review");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const report = useMutation({
    mutationFn: async () => {
      if (!user || !reportTarget) throw new Error("Sign in to report a post");
      const reason = normalizeFeedBody(reportReason);
      if (reason.length < 3) throw new Error("Add a short reason");
      const { error } = await (supabase.from("feed_post_reports") as any).upsert(
        { post_id: reportTarget, reporter_id: user.id, reason },
        { onConflict: "post_id,reporter_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setReportTarget(null);
      setReportReason("");
      toast.success("Reported to the moderation team");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const block = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("Sign in to block a member");
      if (blockedId === user.id) throw new Error("You cannot block yourself");
      const { error } = await (supabase.from("feed_blocks") as any).upsert(
        { blocker_id: user.id, blocked_id: blockedId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      return blockedId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-blocks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["blocked-accounts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast.success("Member hidden from your Feed");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const edit = useMutation({
    mutationFn: async () => {
      if (!user || !editingPost) throw new Error("Sign in to edit your post");
      const clean = normalizeFeedBody(editBody);
      if (clean.length < 3) throw new Error("Write at least three characters");
      const { error } = await (supabase.from("feed_posts") as any)
        .update({ body: clean, hashtags: extractFeedHashtags(clean) })
        .eq("id", editingPost)
        .eq("author_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingPost(null);
      setEditBody("");
      toast.success("Post updated");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (postId: string) =>
      moveToRecycleBin("feed_post", postId, "Deleted by the author"),
    onSuccess: () => {
      toast.success("Post moved to your Recycle Bin");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const blocked = useMemo(() => new Set(blockedRows.map((row) => row.blocked_id)), [blockedRows]);
  const visiblePosts = sortedPosts.filter((post) => !blocked.has(post.author_id));
  const normalizedQuery = q.trim().toLowerCase();
  const matches = (value: string | null | undefined) =>
    !normalizedQuery || `${value ?? ""}`.toLowerCase().includes(normalizedQuery);
  const topicMatches = (post: Post) => !normalizedQuery || post.hashtags.some((tag) => tag.toLowerCase().includes(normalizedQuery.replace(/^#/, "")));
  const filteredPosts = visiblePosts.filter(
    (post) => (!type || type === "community") && (view === "discussions" ? (post.comment_count ?? 0) > 0 : view === "topics" ? topicMatches(post) : matches(post.body)),
  );
  const editorialSource = view === "trending" ? trendingEditorial : automatic;
  const filteredEditorial = editorialSource.filter(
    (item) => (!type || type === item.kind) && (matches(item.title) || matches(item.body)),
  );
  const timeline: TimelineItem[] = [
    ...filteredPosts.map((post) => ({ kind: "community" as const, id: post.id, created_at: post.created_at, post })),
    ...filteredEditorial.map((item) => ({ kind: "editorial" as const, id: `${item.kind}-${item.id}`, created_at: item.created_at, item })),
  ];
  const timelineScore = (entry: TimelineItem) => entry.kind === "editorial"
    ? 100 - (entry.item.rank ?? 999)
    : (entry.post.score ?? 0) + (entry.post.comment_count ?? 0) * 2;
  timeline.sort((a, b) => view === "trending" ? timelineScore(b) - timelineScore(a) : b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
      <header className="mb-5 rounded-xl border border-border bg-gradient-to-br from-card via-card to-accent/10 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          Media &amp; community
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Media &amp; Feed</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Road users, contributors and the Share Barabara newsroom discussing safer roads, transport
          and the infrastructure around us.
        </p>
        <form className="mt-4 flex max-w-2xl gap-2" method="get" action="/feed">
          <Input name="q" defaultValue={q} placeholder="Search Media & Feed" aria-label="Search Media & Feed" />
          <Button type="submit" size="icon" aria-label="Search Media & Feed"><Search className="size-4" /></Button>
        </form>
      </header>
      <SocialFollowSection />
      <div className="mt-4 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Image className="size-4 text-brand-blue" /><div><p className="text-sm font-bold">Media Directory</p><p className="text-xs text-muted-foreground">Browse approved videos and media linked to Share Barabara content.</p></div></div>
          <Button asChild size="sm" variant="outline"><Link to="/media">Explore media <Link2 className="ml-1 size-3.5" /></Link></Button>
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:items-start">
        <aside className="rounded-lg border border-border bg-card p-3 lg:sticky lg:top-24" aria-label="Feed navigation">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Media &amp; Feed</p>
          <nav className="flex flex-wrap gap-2 lg:flex-col" aria-label="Media & Feed sections">
            {[['for_you', 'For You'], ['following', 'Following'], ['trending', 'Trending'], ['topics', 'Topics'], ['discussions', 'Discussions']].map(([value, label]) => (
              <Link key={value} to="/feed" search={{ view: value as "for_you" | "following" | "trending" | "topics" | "discussions", sort, q, type }} className={`rounded-md px-3 py-2 text-sm font-semibold ${view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {value === "trending" ? <TrendingUp className="mr-1 inline size-4" /> : null}{label}
              </Link>
            ))}
            <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground" title="Messages are not available yet" aria-disabled="true"><MessageSquare className="size-3.5" /> Messages</span>
            <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground" title="Calls are not available yet" aria-disabled="true"><PhoneCall className="size-3.5" /> Calls</span>
          </nav>
        </aside>
        <main className="min-w-0">
          {user ? (
            <section className="rounded-lg border border-border bg-card p-5 card-elevated">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-accent" />
                <h2 className="font-bold">Start a conversation</h2>
              </div>
              <Textarea
                className="mt-4"
                rows={4}
                maxLength={4000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What are road users seeing, discussing or learning today? Use #topics to help people discover it."
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {mediaAttachmentsEnabled ? <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand-blue"><Image className="size-4" /> Attach photo/video<input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 4))} /></label> : <span className="text-xs text-muted-foreground">Media attachments are awaiting storage approval.</span>}
                {attachments.length ? <span className="text-xs text-muted-foreground">{attachments.length} attachment{attachments.length === 1 ? "" : "s"} selected</span> : null}
                {attachments.length ? <button type="button" className="text-xs font-semibold text-destructive" onClick={() => setAttachments([])}>Remove attachments</button> : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Posts that pass automated safety checks publish immediately. Posts flagged for safety review are held for moderator action.
                </span>
                <Button
                  disabled={submit.isPending || body.trim().length < 3}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? "Posting…" : "Post"}
                </Button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-border bg-muted/30 p-5">
              <p className="font-semibold">Join the conversation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Link to="/auth" className="font-semibold underline">
                  Sign in
                </Link>{" "}
                to create posts, vote and reply. Everyone can read the public Feed.
              </p>
            </section>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Filter className="size-3.5" /> Sort</span>
            {(["new", "top", "hot"] as const).map((value) => (
              <Link key={value} to="/feed" search={{ view, sort: value, q, type }} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sort === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {value === "hot" ? <TrendingUp className="mr-1 inline size-3.5" /> : null}{value[0].toUpperCase() + value.slice(1)}
              </Link>
            ))}
            {([['', 'All'], ['article', 'Articles'], ['alert', 'Alerts'], ['report', 'Reports'], ['campaign', 'Campaigns'], ['infrastructure', 'Infrastructure'], ['community', 'Community']] as const).map(([value, label]) => (
              <Link key={value || 'all'} to="/feed" search={{ view, sort, q, type: value }} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type === value ? "bg-accent text-brand-navy" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</Link>
            ))}
          </div>
          {view === "following" ? (
            <div className="mt-4 rounded-md border border-caution/40 bg-caution/10 p-3 text-sm text-caution-foreground">
              <strong>Following</strong> needs a follow relationship model that is not present in Share Barabara yet. For You remains the verified unified public Feed.
            </div>
          ) : null}
          {isLoading ? (
            <p className="mt-6 text-muted-foreground">Loading community posts…</p>
          ) : null}
          {feedError ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p className="font-semibold">Community posts are unavailable</p>
              <p className="mt-1">
                {feedError.message} You can still browse the public Share Barabara updates below.
              </p>
            </div>
          ) : null}
          <div className="mt-6 space-y-5" aria-live="polite">
            {timeline.map((entry, index) => entry.kind === "editorial" ? (
              <Fragment key={entry.id}>
                {(index + 1) % 4 === 0 ? <BannerAd placement={`feed-list-interval-${(index + 1) / 4}`} /> : null}
                <a href={entry.item.href} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent card-elevated">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">{entry.item.kind === "article" ? "News & Articles" : entry.item.kind === "alert" ? "Active alert" : entry.item.kind === "report" ? "Approved report" : entry.item.kind === "campaign" ? "Campaign" : "Infrastructure issue"}</span><span className="text-xs text-muted-foreground">{timeAgo(entry.item.created_at)}</span></div>
                  <h2 className="mt-2 font-bold">{entry.item.title}</h2>
                  {entry.item.location ? <p className="mt-1 text-xs text-muted-foreground">{entry.item.location}</p> : null}
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{entry.item.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">Open canonical source <Link2 className="size-3.5" /></span>
                </a>
              </Fragment>
            ) : (() => {
              const post = entry.post;
              return (
              <Fragment key={entry.id}>
                {(index + 1) % 4 === 0 ? <BannerAd placement={`feed-list-interval-${(index + 1) / 4}`} /> : null}
                <article
                  key={post.id}
                  className="rounded-lg border border-border bg-card p-5 card-elevated"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserLink
                        userId={post.author_id}
                        name={names[post.author_id]}
                        username={usernames[post.author_id]}
                        verified={!!verified[post.author_id]}
                      />
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {post.status === "published"
                          ? "Community post"
                          : post.moderation_status === "rejected"
                            ? "Held for safety review"
                            : "Awaiting moderator review"}
                      </span>
                      {user?.id === post.author_id && post.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Edit pending post"
                            onClick={() => {
                              setEditingPost(post.id);
                              setEditBody(post.body);
                            }}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete pending post"
                            onClick={() => {
                              if (window.confirm("Move this post to your Recycle Bin?"))
                                remove.mutate(post.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {editingPost === post.id ? (
                    <div className="mt-4">
                      <Textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        rows={4}
                        maxLength={4000}
                        aria-label="Edit Feed post"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          disabled={edit.isPending || editBody.trim().length < 3}
                          onClick={() => edit.mutate()}
                        >
                          {edit.isPending ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPost(null);
                            setEditBody("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 whitespace-pre-wrap text-[0.98rem] leading-7">{post.body}</p>
                  )}
                  {post.hashtags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="text-xs font-semibold text-brand-blue">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {post.media?.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {post.media.map((media) => {
                        const signedUrl = signedMedia[media.id]?.signed_url;
                        if (!signedUrl) return null;
                        return media.media_type === "video" ? (
                          <video key={signedUrl} controls preload="metadata" className="max-h-[420px] w-full rounded-md bg-muted object-contain" src={signedUrl} />
                        ) : (
                          <img key={signedUrl} src={signedUrl} alt={media.filename} loading="lazy" className="max-h-[420px] w-full rounded-md bg-muted object-contain" />
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                    <VoteButtons
                      net={post.score ?? 0}
                      mine={scores[post.id]?.mine ?? 0}
                      onVote={(value) => vote(post.id, value)}
                    />
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                    >
                      <MessageSquare className="size-4" /> Comments ({post.comment_count ?? 0})
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        const url = `${window.location.origin}/feed#post-${post.id}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success("Feed link copied");
                        } catch {
                          toast.error("Unable to copy the Feed link");
                        }
                      }}
                    >
                      <Link2 className="size-4" /> Share
                    </button>
                    {user && post.author_id !== user.id ? (
                      <>
                        <button
                          type="button"
                          className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                          onClick={() => setReportTarget(post.id)}
                        >
                          <ShieldAlert className="mr-1 inline size-4" /> Report
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                          onClick={() => block.mutate(post.author_id)}
                        >
                          Block
                        </button>
                      </>
                    ) : null}
                  </div>
                  {selectedPost === post.id ? (
                    <CommentSection entityType="feed_post" entityId={post.id} />
                  ) : null}
                </article>
              </Fragment>
              );
            })())}
          </div>
          <section className="mt-10" aria-labelledby="feed-media-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                  Media &amp; Feed
                </p>
                <h2 id="feed-media-heading" className="mt-1 text-xl font-bold">
                  Featured road-safety media
                </h2>
              </div>
              <Link to="/videos" className="text-sm font-semibold text-brand-blue underline">
                Browse media
              </Link>
            </div>
            {media.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {media.map((item) => {
                  const id = youtubeId(item.video_url);
                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className="aspect-video bg-muted">
                        {id ? (
                          <iframe
                            className="size-full"
                            src={`https://www.youtube.com/embed/${id}`}
                            title={item.title}
                            loading="lazy"
                            allowFullScreen
                          />
                        ) : (
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex size-full items-center justify-center text-sm font-semibold text-brand-blue underline"
                          >
                            Open media
                          </a>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold">{item.title}</h3>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                Featured media will appear here when staff or the community publishes it.
              </p>
            )}
          </section>
        </main>
        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Hash className="size-5 text-accent" />
              <h2 className="font-bold">Trending topics</h2>
            </div>
            {trends.length ? (
              <ul className="mt-4 space-y-3">
                {trends.map((trend) => (
                  <li key={trend.tag} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-brand-blue">#{trend.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {trend.count} post{trend.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Topics will appear as the community posts and discusses.
              </p>
            )}
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-bold">Community standards</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep reports factual, protect people’s privacy, and do not share dangerous
              instructions or unverified accusations. Moderators may hide content while reviewing
              reports.
            </p>
            {rank >= 3 ? (
              <Link
                to="/admin/comments"
                className="mt-3 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Open moderation tools
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
      <div className="mt-12 space-y-10">
        <SocialFollowSection />
        <EditorialDiscoveryRail exclude="feed" />
        <MjengoPreviews context="feed" />
      </div>
      <Dialog
        open={!!reportTarget}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Feed post</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Tell moderators what needs attention"
          />
          <Button
            variant="destructive"
            disabled={report.isPending || reportReason.trim().length < 3}
            onClick={() => report.mutate()}
          >
            {report.isPending ? "Sending…" : "Send report"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
