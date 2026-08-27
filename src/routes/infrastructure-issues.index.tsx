import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Construction, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { longDate } from "@/lib/format";
import { KENYA_COUNTIES, ROAD_AUTHORITIES, STRUCTURE_TYPES } from "@/lib/constants";
import { InfrastructureIssueForm } from "@/components/site/infrastructure-issue-form";
import { BannerAd } from "@/components/site/banner-ad";

export const Route = createFileRoute("/infrastructure-issues/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { county?: string; authority?: string; structure?: string } => {
    const county = typeof search["county"] === "string" ? (search["county"] as string) : undefined;
    const authority =
      typeof search["authority"] === "string" ? (search["authority"] as string) : undefined;
    const structure =
      typeof search["structure"] === "string" ? (search["structure"] as string) : undefined;
    return {
      ...(county ? { county } : {}),
      ...(authority ? { authority } : {}),
      ...(structure ? { structure } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Infrastructure Issues in Kenya: Share Barabara" },
      {
        name: "description",
        content:
          "Community-reported road infrastructure issues across Kenya: potholes, damaged bridges, drainage and signage problems, compiled for the responsible authority.",
      },
    ],
  }),
  component: InfrastructureIssuesPage,
});

function InfrastructureIssuesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [county, setCounty] = useState(search.county ?? "all");
  const [authority, setAuthority] = useState(search.authority ?? "all");
  const [structure, setStructure] = useState(search.structure ?? "all");
  const [open, setOpen] = useState(false);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["infrastructure-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const visible = issues.filter(
    (i) =>
      (county === "all" || i.county === county) &&
      (authority === "all" || i.authority === authority) &&
      (structure === "all" || i.structure_type === structure),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Infrastructure
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-[1.575rem] font-extrabold">
            <Construction className="size-8 text-accent" /> Road infrastructure issues
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Potholes, damaged bridges, drainage and signage problems reported by the community — not
            always an immediate hazard, but worth fixing before they become one. Compiled for KeNHA,
            KURA, KeRRA and county authorities.
          </p>
        </div>
        {user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Report an issue</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Report an infrastructure issue</DialogTitle>
              </DialogHeader>
              <InfrastructureIssueForm onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild variant="outline">
            <Link to="/auth">Sign in to report an issue</Link>
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger className="w-48">
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
        <Select value={authority} onValueChange={setAuthority}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All authorities</SelectItem>
            {ROAD_AUTHORITIES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={structure} onValueChange={setStructure}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All structure types</SelectItem>
            {STRUCTURE_TYPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && visible.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No issues match this filter yet.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((issue, i) => (
          <Fragment key={issue.id}>
            {i === 3 ? (
              <div className="md:col-span-2 lg:col-span-3">
                <BannerAd />
              </div>
            ) : null}
            <Link
              to="/infrastructure-issues/$issueId"
              params={{ issueId: issue.id }}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors card-elevated hover:border-accent"
            >
              {issue.image_url ? (
                <img
                  src={issue.image_url}
                  alt={issue.title}
                  className="-mx-5 -mt-5 mb-4 aspect-video w-[calc(100%+2.5rem)] rounded-t-lg object-cover"
                />
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                {STRUCTURE_TYPES.find((s) => s.value === issue.structure_type)?.label ??
                  issue.structure_type}
              </span>
              <h2 className="mt-2 font-bold leading-snug text-brand-blue group-hover:underline">
                {issue.title}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {issue.road_name}
                {issue.county ? ` · ${issue.county}` : ""}
              </p>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {issue.summary}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{longDate(issue.created_at)}</p>
            </Link>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
