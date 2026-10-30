import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, ROLE_RANK } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/roads")({
  head: () => ({ meta: [{ title: "Road Registry: Share Barabara Admin" }] }),
  component: RoadRegistryPage,
});

type Road = { id: string; name: string; slug: string; county: string | null; aliases?: string[] | null; geometry?: unknown; geometry_source?: string | null; geometry_confidence?: string | null; registry_status?: string | null };

function RoadRegistryPage() {
  const { rank } = useRoles();
  const canManage = rank >= ROLE_RANK.editor;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aliases, setAliases] = useState("");
  const [geometry, setGeometry] = useState("");
  const [source, setSource] = useState("");
  const { data: roads = [], isLoading } = useQuery({
    queryKey: ["admin-road-registry", search],
    queryFn: async () => {
      const query = (supabase.from("roads") as any).select("*").order("name").limit(100);
      const { data, error } = search.trim() ? await query.ilike("name", `%${search.trim()}%`) : await query;
      if (error) throw error;
      return (data ?? []) as Road[];
    },
  });
  const selected = roads.find((road) => road.id === selectedId) ?? null;
  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !canManage) throw new Error("Editor access is required");
      let parsedGeometry: unknown = null;
      if (geometry.trim()) parsedGeometry = JSON.parse(geometry);
      const { error } = await (supabase.from("roads") as any).update({
        aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean),
        geometry: parsedGeometry,
        geometry_source: source.trim() || null,
        geometry_confidence: parsedGeometry ? "medium" : null,
        updated_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Road registry record saved"); void queryClient.invalidateQueries({ queryKey: ["admin-road-registry"] }); },
    onError: (error: Error) => toast.error(error.message || "Road save failed"),
  });
  const choose = (road: Road) => {
    setSelectedId(road.id);
    setAliases((road.aliases ?? []).join(", "));
    setGeometry(road.geometry ? JSON.stringify(road.geometry, null, 2) : "");
    setSource(road.geometry_source ?? "");
  };
  return <div className="max-w-5xl">
    <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Admin</p>
    <h1 className="mt-1 text-[1.44375rem] font-extrabold">Road Registry</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage canonical road names, aliases and attributed GeoJSON geometry. Coordinates must come from a verified source; AI suggestions require editorial review.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="rounded-lg border border-border bg-card p-4">
        <Label htmlFor="road-registry-search">Search roads</Label>
        <Input id="road-registry-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ngong Road" className="mt-2" />
        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : <ul className="mt-4 divide-y divide-border">{roads.map((road) => <li key={road.id}><button type="button" className={`w-full px-2 py-3 text-left text-sm hover:bg-muted ${selectedId === road.id ? "bg-muted" : ""}`} onClick={() => choose(road)}><span className="font-semibold">{road.name}</span><span className="ml-2 text-xs text-muted-foreground">{road.county ?? "Geography pending"} · {road.registry_status ?? "active"}</span></button></li>)}</ul>}
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-bold">Geometry and aliases</h2>
        {!selected ? <p className="mt-3 text-sm text-muted-foreground">Select a road to review its canonical record.</p> : <div className="mt-4 space-y-4">
          <p className="text-sm"><span className="font-semibold">{selected.name}</span> <span className="text-muted-foreground">({selected.id})</span></p>
          <div><Label htmlFor="road-aliases">Aliases, comma separated</Label><Input id="road-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} disabled={!canManage} className="mt-1" /></div>
          <div><Label htmlFor="road-geometry-source">Geometry source</Label><Input id="road-geometry-source" value={source} onChange={(event) => setSource(event.target.value)} disabled={!canManage} placeholder="OpenStreetMap / external ID" className="mt-1" /></div>
          <div><Label htmlFor="road-geometry">Verified GeoJSON geometry</Label><textarea id="road-geometry" value={geometry} onChange={(event) => setGeometry(event.target.value)} disabled={!canManage} placeholder='{"type":"LineString","coordinates":[[36.7,-1.3],[36.8,-1.31]]}' className="mt-1 min-h-40 w-full rounded-md border border-input bg-background p-2 font-mono text-xs" /></div>
          <Button disabled={!canManage || save.isPending} onClick={() => save.mutate()}>Save reviewed road data</Button>
          {!canManage ? <p className="text-xs text-muted-foreground">Editor access is required to change registry data.</p> : null}
        </div>}
      </section>
    </div>
  </div>;
}
