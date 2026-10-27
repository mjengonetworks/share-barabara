import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type SearchResult = { id: string; title: string; type: string; href: string };

const SOURCES = [
  { table: "news", type: "Article", href: (id: string) => `/admin/articles/${id}/edit` },
  { table: "accident_reports", type: "Accident report", href: (id: string) => `/admin/reports/${id}/edit` },
  { table: "alerts", type: "Alert", href: (id: string) => `/admin/alerts/${id}/edit` },
  { table: "campaigns", type: "Campaign", href: (id: string) => `/admin/campaigns/${id}/edit` },
  { table: "infrastructure_issues", type: "Infrastructure issue", href: (id: string) => `/admin/infrastructure-issues/${id}/edit` },
] as const;

export function AdminGlobalSearch() {
  const [term, setTerm] = useState("");
  const query = term.trim();
  const results = useQuery({
    enabled: query.length >= 2,
    queryKey: ["admin-global-search", query],
    queryFn: async () => {
      const batches = await Promise.all(SOURCES.map(async (source) => {
        const { data, error } = await (supabase.from(source.table) as any)
          .select("id,title")
          .ilike("title", `%${query}%`)
          .limit(5);
        if (error) return [] as SearchResult[];
        return (data ?? []).map((row: { id: string; title: string }) => ({
          id: row.id, title: row.title, type: source.type, href: source.href(row.id),
        }));
      }));
      return batches.flat().slice(0, 12);
    },
  });

  return (
    <div className="relative min-w-0 flex-1 max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search admin content…"
        aria-label="Search admin content"
        className="h-10 pl-9"
      />
      {query.length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg">
          {results.isLoading ? <p className="p-3 text-sm text-muted-foreground">Searching…</p> : null}
          {!results.isLoading && !results.data?.length ? <p className="p-3 text-sm text-muted-foreground">No authorised matches.</p> : null}
          {results.data?.map((result) => (
            <Link key={`${result.type}-${result.id}`} to={result.href as never} className="block rounded px-3 py-2 hover:bg-muted">
              <span className="block truncate text-sm font-semibold">{result.title}</span>
              <span className="text-xs text-muted-foreground">{result.type}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
