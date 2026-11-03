import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Image as ImageIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListingSurface } from "@/components/admin/admin-listing-surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useViewCounts } from "@/hooks/useViewCounts";

export const Route = createFileRoute("/_authenticated/admin/my-content")({
  head: () => ({ meta: [{ title: "My Content: Share Barabara Admin" }] }),
  component: MyContentPage,
});

const SOURCES = [
  { key: "articles", table: "news", owner: "author_id", label: "Articles", select: "id,title,status,created_at,image_url,slug", edit: (id: string) => `/admin/articles/${id}/edit`, create: "/admin/my-articles/new" },
  { key: "reports", table: "accident_reports", owner: "user_id", label: "Accident reports", select: "id,title,status,created_at,image_url", edit: (id: string) => `/admin/reports/${id}/edit`, create: "/admin/reports/new" },
  { key: "alerts", table: "alerts", owner: "user_id", label: "Hazard alerts", select: "id,title,status,created_at,image_url", edit: (id: string) => `/admin/alerts/${id}/edit`, create: "/admin/alerts/new" },
  { key: "campaigns", table: "campaigns", owner: "user_id", label: "Campaigns", select: "id,title,status,created_at,image_url", edit: (id: string) => `/admin/campaigns/${id}/edit`, create: "/admin/campaigns/new" },
  { key: "infrastructure", table: "infrastructure_issues", owner: "user_id", label: "Infrastructure issues", select: "id,title,status,created_at,image_url", edit: (id: string) => `/admin/infrastructure-issues/${id}/edit`, create: "/admin/infrastructure-issues/new" },
  { key: "feed", table: "feed_posts", owner: "author_id", label: "Feed posts", select: "id,body,status,created_at", edit: () => "/admin/feed", create: "/admin/feed" },
  { key: "videos", table: "videos", owner: "user_id", label: "Media / videos", select: "id,title,status,created_at", edit: () => "/admin/videos", create: "/admin/videos" },
] as const;

const NAVIGATION = [
  ...SOURCES.map((source) => ({ key: source.key, label: `My ${source.label}`, href: source.key === "articles" ? "/admin/my-articles" : `/admin/my-content?type=${source.key}`, create: source.create })),
  { key: "quotes", label: "My Quotes", href: "", create: "" },
];

function MyContentPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewSort, setViewSort] = useState("none");
  const [page, setPage] = useState(1);
  const selectedType = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null;
  useEffect(() => setPage(1), [search, status, selectedType, viewSort]);
  const activeSources = selectedType ? SOURCES.filter((source) => source.key === selectedType) : SOURCES;
  const content = useQuery({
    enabled: !!user,
    queryKey: ["my-content", user?.id, selectedType],
    queryFn: async () => {
      const batches = await Promise.all(activeSources.map(async (source) => {
        const { data } = await (supabase.from(source.table) as any)
          .select(source.select)
          .eq(source.owner, user!.id)
          .order("created_at", { ascending: false })
          .limit(25);
        return (data ?? []).map((row: any) => ({ ...row, title: row.title ?? row.body?.slice(0, 100) ?? "Untitled", label: source.label, sourceKey: source.key, edit: source.edit(row.id), create: source.create }));
      }));
      return batches.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
  });

  const filteredContent = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (content.data ?? []).filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      return !query || item.title.toLowerCase().includes(query);
    });
  }, [content.data, search, status]);
  const articleIds = filteredContent.filter((item) => item.sourceKey === "articles").map((item) => item.id);
  const { data: viewCounts = {}, isError: viewCountsError, isLoading: viewCountsLoading } = useViewCounts("news_views", "news_id", articleIds);
  const sortedContent = useMemo(() => {
    if (viewSort === "none") return filteredContent;
    return [...filteredContent].sort((a, b) => {
      const aViews = a.sourceKey === "articles" ? viewCounts[a.id] ?? 0 : -1;
      const bViews = b.sourceKey === "articles" ? viewCounts[b.id] ?? 0 : -1;
      return viewSort === "desc" ? bViews - aViews : aViews - bViews;
    });
  }, [filteredContent, viewSort, viewCounts]);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(sortedContent.length / pageSize));
  const pagedContent = sortedContent.slice((page - 1) * pageSize, page * pageSize);

  return <div className="w-full max-w-[1500px]">
    <AdminPageHeader eyebrow="Overview" title="My content" description="Content you created or own. Each list is filtered server-side by your account and keeps the existing editorial permissions." />
    {activeSources.length === 1 ? <a className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90" href={activeSources[0].create}>Add new {activeSources[0].label.toLowerCase()}</a> : null}
    <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="My content destinations">
      {NAVIGATION.map((item) => item.href ? <a key={item.key} className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-brand-blue" href={item.href}><p className="font-bold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">Open owned list</p></a> : <div key={item.key} className="rounded-lg border border-dashed border-border bg-muted/30 p-4"><p className="font-bold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">No user-owned Quotes list is implemented.</p></div>)}
    </section>
    <div className="mt-5 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
      <div><Label htmlFor="my-content-search">Search owned content</Label><Input id="my-content-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title…" /></div>
      <div><Label>Status</Label><Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="pending_review">Pending review</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="active">Active</SelectItem></SelectContent></Select></div>
      <div><Label>Views order</Label><Select value={viewSort} onValueChange={(value) => { setViewSort(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Default order</SelectItem><SelectItem value="desc">Highest first</SelectItem><SelectItem value="asc">Lowest first</SelectItem></SelectContent></Select></div>
    </div>
    <AdminListingSurface className="mt-5">
      <div className="grid min-w-[1100px] grid-cols-[72px_minmax(0,2fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_minmax(8rem,auto)_auto] items-center gap-3 border-b border-border bg-muted/45 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><span>Image</span><span>Title / type</span><span>Status</span><span>Created</span><span>Views</span><span>Actions</span></div>
      <div className="min-w-[1100px] divide-y divide-border/70">
        {pagedContent.map((item) => <div key={`${item.label}-${item.id}`} className="grid grid-cols-[72px_minmax(0,2fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_minmax(8rem,auto)_auto] items-center gap-3 px-4 py-3">
          {item.image_url ? <img src={item.image_url} alt="" className="h-12 w-[70px] rounded object-cover" /> : <div className="flex size-12 items-center justify-center rounded bg-muted"><ImageIcon className="size-5 text-muted-foreground" /></div>}
          <div className="min-w-0"><p className="font-semibold">{item.title || "Untitled"}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>
          <span className="text-sm capitalize text-muted-foreground">{String(item.status ?? "draft").replace("_", " ")}</span>
          <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time>
          <span className="text-xs text-muted-foreground">{item.sourceKey === "articles" ? viewCountsError || viewCountsLoading ? "—" : viewCounts[item.id] ?? 0 : "—"}</span>
          <div className="flex gap-2"><a className="text-sm font-semibold text-brand-blue hover:underline" href={item.edit}>Edit</a>{item.sourceKey === "articles" && item.slug ? <a className="text-sm font-semibold text-brand-blue hover:underline" href={`/news/${item.slug}`} target="_blank" rel="noreferrer">View</a> : null}</div>
        </div>)}
        {!content.isLoading && !filteredContent.length ? <div className="p-10 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 size-6" />No owned content found.</div> : null}
      </div>
    </AdminListingSurface>
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>Page {page} of {pageCount} · {sortedContent.length} records</span>
      <div className="flex gap-2">
        <button type="button" className="rounded border border-border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
        <button type="button" className="rounded border border-border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
      </div>
    </div>
  </div>;
}
