import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { campaignStatus } from "@/lib/campaigns";
import { longDate, slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns: Share Barabara Admin" }] }),
  component: CampaignsAdminPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ongoing: "default",
  upcoming: "secondary",
  previous: "outline",
};

type CampaignForm = {
  title: string;
  description: string;
  image_url: string;
  start_date: string;
  end_date: string;
  report_content: string;
  report_image_url: string;
};

const EMPTY: CampaignForm = {
  title: "",
  description: "",
  image_url: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  report_content: "",
  report_image_url: "",
};

function CampaignsAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(EMPTY);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setEditingId(id);
    setForm({
      title: c.title,
      description: c.description,
      image_url: c.image_url ?? "",
      start_date: c.start_date,
      end_date: c.end_date,
      report_content: c.report_content ?? "",
      report_image_url: c.report_image_url ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        report_content: form.report_content.trim() || null,
        report_image_url: form.report_image_url.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaigns")
          .insert({ ...payload, slug: slugify(form.title), created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Campaign updated" : "Campaign created");
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Campaigns</h1>
      <p className="mt-2 text-muted-foreground">
        Status (upcoming / ongoing / previous) is derived automatically from the dates. Once a
        campaign is over, write it up as a report — it appears on the public Campaigns page under
        Previous Campaigns.
      </p>

      <div className="mt-6">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditingId(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit campaign" : "New campaign"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="c-title">Title</Label>
                <Input
                  id="c-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-img">Image URL (optional)</Label>
                <Input
                  id="c-img"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-start">Start date</Label>
                  <Input
                    id="c-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="c-end">End date</Label>
                  <Input
                    id="c-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <Label htmlFor="c-report-img">Report image URL (optional)</Label>
                <Input
                  id="c-report-img"
                  value={form.report_image_url}
                  onChange={(e) => setForm({ ...form, report_image_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-report">Campaign report (shown once the campaign is over)</Label>
                <RichTextEditor
                  id="c-report"
                  rows={6}
                  value={form.report_content}
                  onChange={(v) => setForm({ ...form, report_content: v })}
                  placeholder="How the campaign went, with photos or a video from the toolbar."
                />
              </div>
              <Button
                disabled={!form.title.trim() || !form.description.trim() || save.isPending}
                onClick={() => save.mutate()}
              >
                {editingId ? "Save changes" : "Create campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <ul className="mt-6 space-y-3">
        {campaigns.map((c) => {
          const status = campaignStatus(c.start_date, c.end_date);
          return (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              {c.image_url ? (
                <img src={c.image_url} alt="" className="size-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                  <Megaphone className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                    {status}
                  </Badge>
                  <p className="truncate font-semibold">{c.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {longDate(c.start_date)} – {longDate(c.end_date)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(c.id)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(c.id)}
              >
                Delete
              </Button>
            </li>
          );
        })}
        {!isLoading && campaigns.length === 0 ? (
          <p className="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No campaigns yet.
          </p>
        ) : null}
      </ul>
    </div>
  );
}
