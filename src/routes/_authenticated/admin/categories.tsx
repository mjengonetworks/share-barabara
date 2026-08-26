import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories & Filters: Share Barabara Admin" }] }),
  component: CategoriesPage,
});

function slugValue(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type TableName =
  "page_categories" | "news_categories" | "hazard_types" | "alert_severities" | "report_severities";

/** Simple name-only list (page/news categories): the name is both the
 *  display label and the value stored on rows. */
function NameListEditor({
  table,
  queryKey,
  extraInvalidate,
  placeholder,
}: {
  table: TableName;
  queryKey: string;
  extraInvalidate: string[];
  placeholder: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; sort_order: number }[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    for (const k of extraInvalidate) queryClient.invalidateQueries({ queryKey: [k] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = rows.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
      const { error } = await supabase
        .from(table as never)
        .insert({ name: name.trim(), sort_order: nextOrder } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added");
      setName("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase
        .from(table as never)
        .update({ name: newName.trim() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="max-w-xs"
        />
        <Button disabled={name.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
          Add
        </Button>
      </div>

      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <Input
              defaultValue={c.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== c.name) rename.mutate({ id: c.id, newName: v });
              }}
              className="max-w-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(c.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Value+label list (hazard types, alert/report severities): value is the
 *  stable string stored on rows, auto-derived from the label on add. */
function ValueLabelListEditor({
  table,
  queryKey,
  extraInvalidate,
  placeholder,
}: {
  table: TableName;
  queryKey: string;
  extraInvalidate: string[];
  placeholder: string;
}) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as { id: string; value: string; label: string; sort_order: number }[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    for (const k of extraInvalidate) queryClient.invalidateQueries({ queryKey: [k] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = rows.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
      const { error } = await supabase
        .from(table as never)
        .insert({ value: slugValue(label), label: label.trim(), sort_order: nextOrder } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added");
      setLabel("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, newLabel }: { id: string; newLabel: string }) => {
      const { error } = await supabase
        .from(table as never)
        .update({ label: newLabel.trim() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={placeholder}
          className="max-w-xs"
        />
        <Button disabled={label.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
          Add
        </Button>
      </div>

      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <Input
              defaultValue={c.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== c.label) rename.mutate({ id: c.id, newLabel: v });
              }}
              className="max-w-xs"
            />
            <span className="text-xs text-muted-foreground">{c.value}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(c.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoriesPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Categories &amp; filters</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Manage the picker options used across articles, alerts and reports. Removing an option
        doesn't change existing content already using it — it just stops showing up for new
        submissions.
      </p>

      <Tabs defaultValue="news" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="news">Article categories</TabsTrigger>
          <TabsTrigger value="hazards">Hazard types</TabsTrigger>
          <TabsTrigger value="alert-severities">Alert severities</TabsTrigger>
          <TabsTrigger value="report-severities">Report severities</TabsTrigger>
          <TabsTrigger value="pages">Page categories</TabsTrigger>
        </TabsList>
        <TabsContent value="news">
          <NameListEditor
            table="news_categories"
            queryKey="news-categories"
            extraInvalidate={["news-categories"]}
            placeholder="New category name"
          />
        </TabsContent>
        <TabsContent value="hazards">
          <ValueLabelListEditor
            table="hazard_types"
            queryKey="hazard-types"
            extraInvalidate={["hazard-types"]}
            placeholder="New hazard type label"
          />
        </TabsContent>
        <TabsContent value="alert-severities">
          <ValueLabelListEditor
            table="alert_severities"
            queryKey="alert-severities"
            extraInvalidate={["alert-severities"]}
            placeholder="New severity label"
          />
        </TabsContent>
        <TabsContent value="report-severities">
          <ValueLabelListEditor
            table="report_severities"
            queryKey="report-severities"
            extraInvalidate={["report-severities"]}
            placeholder="New severity label"
          />
        </TabsContent>
        <TabsContent value="pages">
          <p className="mt-2 text-sm text-muted-foreground">
            Categories shown on the Pages directory and in the "Create a page" form. They span both
            road safety and construction industries since a Page can belong to any organisation.
          </p>
          <NameListEditor
            table="page_categories"
            queryKey="page-categories-admin"
            extraInvalidate={["page-categories"]}
            placeholder="New category name"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
