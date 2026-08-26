import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories: Share Barabara Admin" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["page-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["page-categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["page-categories"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
      const { error } = await supabase
        .from("page_categories")
        .insert({ name: name.trim(), sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase
        .from("page_categories")
        .update({ name: newName.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("page_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Categories shown on the Pages directory and in the "Create a page" form. They span both road
        safety and construction industries since a Page can belong to any organisation.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="max-w-xs"
        />
        <Button disabled={name.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
          Add category
        </Button>
      </div>

      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {categories.map((c) => (
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
