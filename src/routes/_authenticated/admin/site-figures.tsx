import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/site-figures")({
  head: () => ({ meta: [{ title: "Site Figures: Share Barabara Admin" }] }),
  component: SiteFiguresPage,
});

function SiteFiguresPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["hub-stats-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_stats")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hub-stats-admin"] });
    queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = stats.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;
      const { error } = await supabase.from("hub_stats").insert({
        label: label.trim(),
        value: value.trim() || "0",
        link_url: linkUrl.trim() || null,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stat added");
      setLabel("");
      setValue("");
      setLinkUrl("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { label?: string; value?: string; link_url?: string | null };
    }) => {
      const { error } = await supabase.from("hub_stats").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hub_stats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stat removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Site figures</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Shown as the "Live statistics" tiles at the top of the Statistics page. Free text, so
        "12,400+" or "38 of 47 counties" both work.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. Registered members"
          className="max-w-xs"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value, e.g. 12,400+"
          className="max-w-xs"
        />
        <Input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Link (optional), e.g. /alerts"
          className="max-w-xs"
        />
        <Button disabled={label.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
          Add stat
        </Button>
      </div>

      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {stats.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
            <Input
              defaultValue={s.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.label) update.mutate({ id: s.id, patch: { label: v } });
              }}
              className="max-w-xs"
            />
            <Input
              defaultValue={s.value}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.value) update.mutate({ id: s.id, patch: { value: v } });
              }}
              className="max-w-xs"
            />
            <Input
              defaultValue={s.link_url ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (s.link_url ?? ""))
                  update.mutate({ id: s.id, patch: { link_url: v || null } });
              }}
              placeholder="Link (optional)"
              className="max-w-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(s.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
