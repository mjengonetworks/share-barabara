import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_RANK, useRoles } from "@/hooks/useRoles";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Taxonomy: Share Barabara Admin" }] }),
  component: TaxonomyPage,
});

type TableName = "page_categories" | "news_categories" | "hazard_types" | "alert_severities" | "report_severities";
type NameRow = { id: string; name: string; label?: string | null; parent_name?: string | null; sort_order: number; active?: boolean };
type ValueRow = { id: string; value: string; label: string; parent_value?: string | null; sort_order: number; active?: boolean };

function isActive(row: { active?: boolean }) {
  // Before the review migration, active is absent. Preserve public behavior.
  return row.active !== false;
}

function useTaxonomyRows(table: TableName, queryKey: string) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as never).select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as (NameRow | ValueRow)[];
    },
  });
}

function useTaxonomyActions(table: TableName, queryKey: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Record<string, unknown> }) => {
      const { error } = await supabase.from(table as never).update(changes as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });
  return { update, refresh };
}

function ArchiveButton({ row, onChange, canManage }: { row: { id: string; active?: boolean }; onChange: (id: string, active: boolean) => void; canManage: boolean }) {
  if (row.active === undefined) {
    return <span className="text-right text-xs text-muted-foreground">Archive after the review migration</span>;
  }
  const active = isActive(row);
  return <Button type="button" variant="outline" size="sm" disabled={!canManage} onClick={() => onChange(row.id, !active)}>{active ? "Archive" : "Restore"}</Button>;
}

function TaxonomyListNotice({ children, description }: { children: ReactNode; description: string }) {
  return <div><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>{children}</div>;
}

function NameListEditor({ table, queryKey, placeholder, canManage }: { table: TableName; queryKey: string; placeholder: string; canManage: boolean }) {
  const [name, setName] = useState("");
  const { data: rows = [], isLoading } = useTaxonomyRows(table, queryKey);
  const { update, refresh } = useTaxonomyActions(table, queryKey);
  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const { error } = await supabase.from(table as never).insert({ name: name.trim(), sort_order: nextOrder } as never);
      if (error) throw error;
    },
    onSuccess: () => { setName(""); toast.success("Taxonomy value added"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <TaxonomyListNotice description="The stored name is a stable value used by existing content and filters. It is not renamed in place. Add a replacement, then archive the old value after the review migration is applied.">
    <div className="mt-4 flex flex-wrap gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} className="max-w-xs" /><Button disabled={!canManage || name.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>Add</Button></div>
    {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
    <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">{rows.map((raw) => { const row = raw as NameRow; return <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">{row.label !== undefined ? <Input defaultValue={row.label ?? row.name} aria-label={`Display label for ${row.name}`} disabled={!canManage} className={`max-w-xs ${!isActive(row) ? "opacity-60" : ""}`} onBlur={(event) => { const next = event.target.value.trim(); if (next && next !== (row.label ?? row.name)) update.mutate({ id: row.id, changes: { label: next } }); }} /> : <span className={`min-w-40 text-sm ${!isActive(row) ? "text-muted-foreground line-through" : ""}`}>{row.name}</span>}<code className="text-xs text-muted-foreground">{row.name}</code><div className="ml-auto"><ArchiveButton row={row} canManage={canManage} onChange={(id, active) => update.mutate({ id, changes: { active } })} /></div></li>; })}</ul>
  </TaxonomyListNotice>;
}

function ValueLabelListEditor({ table, queryKey, placeholder, canManage }: { table: TableName; queryKey: string; placeholder: string; canManage: boolean }) {
  const [label, setLabel] = useState("");
  const { data: rows = [], isLoading } = useTaxonomyRows(table, queryKey);
  const { update, refresh } = useTaxonomyActions(table, queryKey);
  const add = useMutation({
    mutationFn: async () => {
      const value = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!value) throw new Error("Add a label with at least one letter or number");
      const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
      const { error } = await supabase.from(table as never).insert({ value, label: label.trim(), sort_order: nextOrder } as never);
      if (error) throw error;
    },
    onSuccess: () => { setLabel(""); toast.success("Taxonomy value added"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <TaxonomyListNotice description="Machine values are stable identifiers used by forms, public filters and future notification matching. Parent families are shown where configured; only display labels and lifecycle state are editable.">
    <div className="mt-4 flex flex-wrap gap-2"><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={placeholder} className="max-w-xs" /><Button disabled={!canManage || label.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>Add</Button></div>
    {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
    <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">{rows.map((raw) => { const row = raw as ValueRow; return <li key={row.id} className="flex flex-wrap items-center gap-3 p-3"><Input defaultValue={row.label} aria-label={`Display label for ${row.value}`} disabled={!canManage} className={`max-w-xs ${!isActive(row) ? "opacity-60" : ""}`} onBlur={(event) => { const next = event.target.value.trim(); if (next && next !== row.label) update.mutate({ id: row.id, changes: { label: next } }); }} /><code className="text-xs text-muted-foreground">{row.value}</code><div className="ml-auto"><ArchiveButton row={row} canManage={canManage} onChange={(id, active) => update.mutate({ id, changes: { active } })} /></div></li>; })}</ul>
  </TaxonomyListNotice>;
}

function TaxonomyPage() {
  const { rank, isLoading: rolesLoading } = useRoles();
  const canManage = rank >= ROLE_RANK.editor;
  return <div className="max-w-4xl">
    <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Admin</p>
    <h1 className="mt-1 text-[1.44375rem] font-extrabold">Taxonomy</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage the controlled values used across Articles, Alerts, Reports and Pages. Workflow statuses, roles, permissions, verification and subscription tiers are intentionally managed elsewhere.</p>
    {!rolesLoading && !canManage ? <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Editors and administrators can change taxonomy. You have read-only access.</p> : null}
    <Tabs defaultValue="news" className="mt-6"><TabsList className="flex-wrap"><TabsTrigger value="news">Article categories</TabsTrigger><TabsTrigger value="hazards">Hazard types</TabsTrigger><TabsTrigger value="alert-severities">Alert severities</TabsTrigger><TabsTrigger value="report-severities">Report severities</TabsTrigger><TabsTrigger value="pages">Page categories</TabsTrigger></TabsList>
      <TabsContent value="news"><NameListEditor table="news_categories" queryKey="admin-news-categories" placeholder="New article category" canManage={canManage} /></TabsContent>
      <TabsContent value="hazards"><ValueLabelListEditor table="hazard_types" queryKey="admin-hazard-types" placeholder="New hazard type label" canManage={canManage} /></TabsContent>
      <TabsContent value="alert-severities"><ValueLabelListEditor table="alert_severities" queryKey="admin-alert-severities" placeholder="New alert severity label" canManage={canManage} /></TabsContent>
      <TabsContent value="report-severities"><ValueLabelListEditor table="report_severities" queryKey="admin-report-severities" placeholder="New report severity label" canManage={canManage} /></TabsContent>
      <TabsContent value="pages"><NameListEditor table="page_categories" queryKey="admin-page-categories" placeholder="New Page category" canManage={canManage} /></TabsContent>
    </Tabs>
  </div>;
}
