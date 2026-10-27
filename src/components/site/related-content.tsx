import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mediaPublicUrl } from "@/lib/storage";

type ContentType = "article" | "report" | "alert" | "campaign" | "infrastructure";
type RelatedRow = { related_type: ContentType; related_id: string; relationship_type: string };

const labels: Record<ContentType, string> = { article: "Article", report: "Accident Report", alert: "Alert", campaign: "Campaign", infrastructure: "Infrastructure Issue" };

function href(type: ContentType, row: Record<string, unknown>) {
  if (type === "article" && typeof row.slug === "string") return `/news/${row.slug}`;
  if (type === "campaign" && typeof row.slug === "string") return `/campaigns/${row.slug}`;
  if (type === "report") return `/reports/${String(row.id)}`;
  if (type === "alert") return `/alerts/${String(row.id)}`;
  return `/infrastructure-issues/${String(row.id)}`;
}

export function RelatedContent({ contentType, contentId }: { contentType: ContentType; contentId: string }) {
  const query = useQuery({
    queryKey: ["public-related-content", contentType, contentId],
    queryFn: async () => {
      const { data: links, error } = await (supabase.rpc as any)("editorial_public_related_content", { _type: contentType, _id: contentId, _limit: 6 });
      if (error) return [] as Array<Record<string, unknown>>;
      const rows = (links ?? []) as RelatedRow[];
      const records: Array<Record<string, unknown>> = [];
      for (const row of rows) {
        const table = row.related_type === "article" ? "news" : row.related_type === "report" ? "accident_reports" : row.related_type === "alert" ? "alerts" : row.related_type === "campaign" ? "campaigns" : "infrastructure_issues";
        const { data } = await (supabase.from(table) as any).select("id,title,slug,summary,description,image_url").eq("id", row.related_id).maybeSingle();
        if (data) records.push({ ...data, related_type: row.related_type, relationship_type: row.relationship_type });
      }
      return records;
    },
  });

  if (!query.data?.length) return null;
  return (
    <section className="rounded-lg border border-border bg-card p-5" aria-labelledby={`related-content-${contentId}`}>
      <h2 id={`related-content-${contentId}`} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground"><Link2 className="size-4" /> Related Share Barabara content</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {query.data.map((item) => {
          const type = item.related_type as ContentType;
          const image = typeof item.image_url === "string" ? mediaPublicUrl(item.image_url) : null;
          return <Link key={`${type}-${String(item.id)}`} to={href(type, item) as never} className="flex gap-3 rounded border border-border p-3 transition-colors hover:bg-muted/50"><div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{labels[type]}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{String(item.title ?? "Untitled")}</p></div></Link>;
        })}
      </div>
    </section>
  );
}
