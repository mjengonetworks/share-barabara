import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ENTITY_TYPES: Record<string, string[]> = {
  road: ["road", "corridor"],
  rail: ["railway", "corridor"],
  aviation: ["airport"],
  maritime: ["port"],
  inland_water: ["port", "waterway"],
  other: ["corridor"],
};

type Entity = { id: string; name: string; entity_type: string };

export function TransportEntitySelector({ mode, value, onChange }: { mode: string; value: string | null; onChange: (id: string | null) => void }) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["transport-entities", mode],
    enabled: Boolean(mode),
    queryFn: async () => {
      const { data, error } = await (supabase.from("transport_entities" as never) as any)
        .select("id,name,entity_type")
        .in("entity_type", ENTITY_TYPES[mode] ?? ["corridor"])
        .order("name")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Entity[];
    },
    staleTime: 5 * 60_000,
  });

  const entities = useMemo(() => (query.data ?? []).filter((entity) => entity.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50), [query.data, search]);
  if (query.isError) return <p className="text-xs text-muted-foreground">Canonical transport entities are not available yet; keep the specific location in the report details.</p>;
  return <div className="sm:col-span-2"><Label htmlFor="transport-entity-search">Canonical transport entity</Label><Input id="transport-entity-search" className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search verified roads, railways, airports or ports" disabled={query.isLoading} /><select id="transport-entity" className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} disabled={query.isLoading}><option value="">Not specified</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></div>;
}
