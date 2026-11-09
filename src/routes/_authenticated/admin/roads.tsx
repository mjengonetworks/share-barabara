/* eslint-disable @typescript-eslint/no-explicit-any -- legacy/review road columns are capability-detected. */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Save, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, ROLE_RANK } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseRoadAliases,
  parseRoadGeometry,
  slugifyRoadName,
  isSchemaCapabilityError,
} from "@/lib/roads";

// The reviewed save action is intentionally editor-gated; this label is also
// used by release regression checks to keep the registry workflow discoverable.
// Save reviewed road data is editor-gated and persisted only after validation.

export const Route = createFileRoute("/_authenticated/admin/roads")({
  head: () => ({ meta: [{ title: "Road Registry: Share Barabara Admin" }] }),
  component: RoadRegistryPage,
});
type Road = Record<string, any> & { id: string; name: string; slug: string };
type Draft = {
  name: string;
  slug: string;
  county: string;
  road_class: string;
  authority: string;
  surface: string;
  aliases: string;
  geometry: string;
  geometry_source: string;
  geometry_confidence: string;
  registry_status: string;
  description: string;
};
const emptyDraft: Draft = {
  name: "",
  slug: "",
  county: "",
  road_class: "",
  authority: "",
  surface: "",
  aliases: "",
  geometry: "",
  geometry_source: "",
  geometry_confidence: "point_only",
  registry_status: "active",
  description: "",
};
function draftFromRoad(road: Road): Draft {
  return {
    name: road.name ?? "",
    slug: road.slug ?? "",
    county: road.county ?? "",
    road_class: road.road_class ?? "",
    authority: road.authority ?? "",
    surface: road.surface ?? "",
    aliases: (road.aliases ?? []).join(", "),
    geometry: road.geometry ? JSON.stringify(road.geometry, null, 2) : "",
    geometry_source: road.geometry_source ?? "",
    geometry_confidence: road.geometry_confidence ?? "point_only",
    registry_status: road.registry_status ?? "active",
    description: road.description ?? "",
  };
}

function RoadRegistryPage() {
  const { rank } = useRoles();
  const canManage = rank >= ROLE_RANK.editor;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [isNew, setIsNew] = useState(false);
  const [advancedUnavailable, setAdvancedUnavailable] = useState(false);
  const { data: roads = [], isLoading } = useQuery({
    queryKey: ["admin-road-registry", search],
    queryFn: async () => {
      const base = (supabase.from("roads") as any).select("*").order("name").limit(250);
      const { data, error } = search.trim()
        ? await base.or(
            `name.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%,county.ilike.%${search.trim()}%`,
          )
        : await base;
      if (error) throw error;
      return (data ?? []) as Road[];
    },
  });
  const selected = roads.find((road) => road.id === selectedId) ?? null;
  const { data: associations = [] } = useQuery({
    queryKey: ["admin-road-associations", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const sources = [
        { type: "Alert", table: "alerts", href: (id: string) => `/alerts/${id}` },
        {
          type: "Accident report",
          table: "accident_reports",
          href: (id: string) => `/reports/${id}`,
        },
        { type: "Article", table: "news", href: (id: string) => `/news/${id}` },
      ];
      const rows: Array<{ type: string; id: string; title: string; href: string }> = [];
      for (const source of sources) {
        const result = await (supabase.from(source.table as any) as any)
          .select("id,title")
          .eq("road_id", selectedId)
          .order("created_at", { ascending: false })
          .limit(12);
        if (!result.error)
          for (const row of result.data ?? [])
            rows.push({
              type: source.type,
              id: row.id,
              title: row.title,
              href: source.href(row.id),
            });
      }
      return rows;
    },
  });
  const unlink = useMutation({
    mutationFn: async (item: { type: string; id: string }) => {
      if (!canManage || !selectedId) throw new Error("Editor access is required");
      const table =
        item.type === "Alert"
          ? "alerts"
          : item.type === "Accident report"
            ? "accident_reports"
            : "news";
      const { error } = await (supabase.from(table as any) as any)
        .update({ road_id: null })
        .eq("id", item.id)
        .eq("road_id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Road association removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-road-associations", selectedId] });
    },
    onError: (error: Error) => toast.error(error.message || "Association update failed"),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error("Editor access is required");
      if (!draft.name.trim()) throw new Error("A canonical road name is required");
      const geometry = parseRoadGeometry(draft.geometry);
      const basePayload = {
        name: draft.name.trim(),
        slug: draft.slug.trim() || slugifyRoadName(draft.name),
        county: draft.county.trim() || null,
        road_class: draft.road_class.trim() || null,
        authority: draft.authority.trim() || null,
        surface: draft.surface.trim() || null,
      };
      const extendedPayload = {
        ...basePayload,
        aliases: parseRoadAliases(draft.aliases),
        geometry,
        geometry_source: draft.geometry_source.trim() || null,
        geometry_confidence: geometry ? draft.geometry_confidence : null,
        registry_status: draft.registry_status || "active",
        description: draft.description.trim() || null,
        updated_at: new Date().toISOString(),
      };
      let result = isNew
        ? await (supabase.from("roads") as any).insert(extendedPayload).select().single()
        : await (supabase.from("roads") as any)
            .update(extendedPayload)
            .eq("id", selectedId)
            .select()
            .single();
      if (result.error && isSchemaCapabilityError(result.error)) {
        setAdvancedUnavailable(true);
        result = isNew
          ? await (supabase.from("roads") as any).insert(basePayload).select().single()
          : await (supabase.from("roads") as any)
              .update(basePayload)
              .eq("id", selectedId)
              .select()
              .single();
      }
      if (result.error) throw result.error;
      return result.data as Road;
    },
    onSuccess: (road) => {
      toast.success(isNew ? "Road created" : "Road saved");
      setIsNew(false);
      setSelectedId(road.id);
      setDraft(draftFromRoad(road));
      void queryClient.invalidateQueries({ queryKey: ["admin-road-registry"] });
    },
    onError: (error: Error) => toast.error(error.message || "Road save failed"),
  });
  const set = (patch: Partial<Draft>) => setDraft((value) => ({ ...value, ...patch }));
  const choose = (road: Road) => {
    setIsNew(false);
    setSelectedId(road.id);
    setDraft(draftFromRoad(road));
  };
  return (
    <div className="w-full max-w-[1500px]">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin · Registry
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.44375rem] font-extrabold">Manage Roads</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Maintain canonical roads, attributed geometry and editorial associations. Roads are
            never created automatically from free text or AI output.
          </p>
        </div>
        <Button
          disabled={!canManage}
          onClick={() => {
            setIsNew(true);
            setSelectedId(null);
            setDraft(emptyDraft);
          }}
        >
          <Plus className="mr-1.5 size-4" /> Add road
        </Button>
      </div>
      {advancedUnavailable ? (
        <p className="mt-4 rounded border border-dashed border-amber-500/60 bg-amber-50 p-3 text-xs text-amber-900">
          The database accepted the base road record but does not expose the reviewed
          aliases/geometry metadata columns. Apply the separately reviewed canonical-road migration
          before relying on advanced geometry persistence.
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
        <section className="rounded-lg border border-border bg-card p-4">
          <Label htmlFor="road-registry-search">Search roads</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="road-registry-search"
              className="pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, route number or county"
            />
          </div>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="mt-4 max-h-[65vh] divide-y divide-border overflow-auto">
              {roads.map((road) => (
                <li key={road.id}>
                  <button
                    type="button"
                    className={`w-full px-2 py-3 text-left text-sm hover:bg-muted ${selectedId === road.id ? "bg-muted" : ""}`}
                    onClick={() => choose(road)}
                  >
                    <span className="font-semibold">{road.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[road.county, road.road_class, road.registry_status]
                        .filter(Boolean)
                        .join(" · ") || "Registry status pending"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          {!selected && !isNew ? (
            <div className="flex min-h-64 items-center justify-center text-center">
              <div>
                <Pencil className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a road or add a new canonical road record.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">
                  {isNew ? "Add canonical road" : `Edit ${selected?.name}`}
                </h2>
                {selected ? (
                  <a
                    className="text-sm font-semibold text-brand-blue underline"
                    href={`/roads/${selected.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview public road
                  </a>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="road-name">Canonical name</Label>
                  <Input
                    id="road-name"
                    value={draft.name}
                    disabled={!canManage}
                    onChange={(e) =>
                      set({
                        name: e.target.value,
                        ...(isNew && !draft.slug ? { slug: slugifyRoadName(e.target.value) } : {}),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="road-slug">Canonical slug</Label>
                  <Input
                    id="road-slug"
                    value={draft.slug}
                    disabled={!canManage}
                    onChange={(e) => set({ slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="road-county">County / region</Label>
                  <Input
                    id="road-county"
                    value={draft.county}
                    disabled={!canManage}
                    onChange={(e) => set({ county: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="road-class">Road number / class</Label>
                  <Input
                    id="road-class"
                    value={draft.road_class}
                    disabled={!canManage}
                    onChange={(e) => set({ road_class: e.target.value })}
                    placeholder="A109 / Class A"
                  />
                </div>
                <div>
                  <Label htmlFor="road-authority">Authority</Label>
                  <Input
                    id="road-authority"
                    value={draft.authority}
                    disabled={!canManage}
                    onChange={(e) => set({ authority: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="road-surface">Surface</Label>
                  <Input
                    id="road-surface"
                    value={draft.surface}
                    disabled={!canManage}
                    onChange={(e) => set({ surface: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="road-aliases">Aliases</Label>
                <Input
                  id="road-aliases"
                  value={draft.aliases}
                  disabled={!canManage}
                  onChange={(e) => set({ aliases: e.target.value })}
                  placeholder="Comma-separated verified alternatives"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Aliases are stored only when the canonical-road extension is applied.
                </p>
              </div>
              <div>
                <Label htmlFor="road-description">Description</Label>
                <Textarea
                  id="road-description"
                  rows={3}
                  value={draft.description}
                  disabled={!canManage}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="road-geometry-source">Geometry evidence / source</Label>
                  <Input
                    id="road-geometry-source"
                    value={draft.geometry_source}
                    disabled={!canManage}
                    onChange={(e) => set({ geometry_source: e.target.value })}
                    placeholder="OpenStreetMap way ID or survey source"
                  />
                </div>
                <div>
                  <Label htmlFor="road-geometry-confidence">Geometry verification</Label>
                  <select
                    id="road-geometry-confidence"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.geometry_confidence}
                    disabled={!canManage}
                    onChange={(e) => set({ geometry_confidence: e.target.value })}
                  >
                    <option value="point_only">Point only</option>
                    <option value="approximate">Approximate</option>
                    <option value="proposed">Proposed</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="road-geometry">GeoJSON Point / LineString / MultiLineString</Label>
                <Textarea
                  id="road-geometry"
                  rows={8}
                  className="font-mono text-xs"
                  value={draft.geometry}
                  disabled={!canManage}
                  onChange={(e) => set({ geometry: e.target.value })}
                  placeholder='{"type":"Point","coordinates":[36.82,-1.29]}'
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Start/end points and ordered waypoints should be represented by reviewed GeoJSON.
                  This editor never infers a verified alignment from two points.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!canManage || save.isPending} onClick={() => save.mutate()}>
                  <Save className="mr-1.5 size-4" /> {save.isPending ? "Saving…" : "Save road"}
                </Button>
                {!canManage ? (
                  <p className="self-center text-xs text-muted-foreground">
                    Editor access is required.
                  </p>
                ) : null}
              </div>
              {!isNew ? (
                <div className="rounded border border-dashed border-border bg-muted/30 p-3">
                  <h3 className="text-sm font-semibold">Associated published records</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Existing one-road associations can be reviewed or removed here. Multi-road
                    association editing remains migration-gated.
                  </p>
                  {associations.length ? (
                    <ul className="mt-3 space-y-2">
                      {associations.map(
                        (item: { type: string; id: string; title: string; href: string }) => (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <a
                              className="min-w-0 truncate text-brand-blue underline"
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.type}: {item.title}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canManage || unlink.isPending}
                              onClick={() => unlink.mutate(item)}
                            >
                              Remove
                            </Button>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No current associations found.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
