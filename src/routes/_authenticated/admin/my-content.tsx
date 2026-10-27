import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Image as ImageIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/my-content")({
  head: () => ({ meta: [{ title: "My Content: Share Barabara Admin" }] }),
  component: MyContentPage,
});

const SOURCES = [
  { table: "news", owner: "author_id", label: "Articles", edit: (id: string) => `/admin/articles/${id}/edit` },
  { table: "accident_reports", owner: "user_id", label: "Accident reports", edit: (id: string) => `/admin/reports/${id}/edit` },
  { table: "alerts", owner: "user_id", label: "Hazard alerts", edit: (id: string) => `/admin/alerts/${id}/edit` },
  { table: "campaigns", owner: "user_id", label: "Campaigns", edit: (id: string) => `/admin/campaigns/${id}/edit` },
  { table: "infrastructure_issues", owner: "user_id", label: "Infrastructure issues", edit: (id: string) => `/admin/infrastructure-issues/${id}/edit` },
] as const;

function MyContentPage() {
  const { user } = useAuth();
  const content = useQuery({
    enabled: !!user,
    queryKey: ["my-content", user?.id],
    queryFn: async () => {
      const batches = await Promise.all(SOURCES.map(async (source) => {
        const { data } = await (supabase.from(source.table) as any)
          .select("id,title,status,created_at,image_url")
          .eq(source.owner, user!.id)
          .order("created_at", { ascending: false })
          .limit(25);
        return (data ?? []).map((row: any) => ({ ...row, label: source.label, edit: source.edit(row.id) }));
      }));
      return batches.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
  });

  return <div className="w-full max-w-6xl">
    <AdminPageHeader eyebrow="Overview" title="My content" description="Content you created or own. Edit access remains subject to the existing role and publication rules." />
    <section className="mt-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="hidden grid-cols-[72px_minmax(0,1fr)_10rem_10rem_8rem] gap-4 border-b border-border bg-muted/45 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid"><span>Image</span><span>Title / type</span><span>Status</span><span>Created</span><span>Action</span></div>
      <div className="divide-y divide-border/70">
        {content.data?.map((item) => <div key={`${item.label}-${item.id}`} className="grid gap-3 px-4 py-3 sm:grid-cols-[72px_minmax(0,1fr)_10rem_10rem_8rem] sm:items-center">
          {item.image_url ? <img src={item.image_url} alt="" className="h-12 w-[70px] rounded object-cover" /> : <div className="flex size-12 items-center justify-center rounded bg-muted"><ImageIcon className="size-5 text-muted-foreground" /></div>}
          <div className="min-w-0"><p className="font-semibold">{item.title || "Untitled"}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>
          <span className="text-sm capitalize text-muted-foreground">{String(item.status ?? "draft").replace("_", " ")}</span>
          <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time>
          <Link className="text-sm font-semibold text-brand-blue hover:underline" to={item.edit as never}>Edit</Link>
        </div>)}
        {!content.isLoading && !content.data?.length ? <div className="p-10 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 size-6" />No owned content found.</div> : null}
      </div>
    </section>
  </div>;
}
