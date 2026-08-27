import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Megaphone, Plus } from "lucide-react";
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
import { ImageUploadField } from "@/components/site/image-upload-field";
import { AttachmentsField, type Attachment } from "@/components/site/attachments-field";
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

type EventForm = {
  title: string;
  location: string;
  description: string;
  image_url: string;
  start_date: string;
  end_date: string;
};

const EMPTY_EVENT: EventForm = {
  title: "",
  location: "",
  description: "",
  image_url: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
};

type ReportForm = {
  report_content: string;
  report_image_url: string;
};

function CampaignsAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_EVENT);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reportOpenId, setReportOpenId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>({
    report_content: "",
    report_image_url: "",
  });
  const [reportAttachments, setReportAttachments] = useState<Attachment[]>([]);

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
    setForm(EMPTY_EVENT);
    setAttachments([]);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setEditingId(id);
    setForm({
      title: c.title,
      location: c.location ?? "",
      description: c.description,
      image_url: c.image_url ?? "",
      start_date: c.start_date,
      end_date: c.end_date,
    });
    setAttachments(((c.attachments as Attachment[] | null) ?? []) as Attachment[]);
    setOpen(true);
  };

  const openReport = (id: string) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setReportOpenId(id);
    setReportForm({
      report_content: c.report_content ?? c.description,
      report_image_url: c.report_image_url ?? c.image_url ?? "",
    });
    setReportAttachments(((c.report_attachments as Attachment[] | null) ?? []) as Attachment[]);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        location: form.location.trim() || null,
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        attachments,
        start_date: form.start_date,
        end_date: form.end_date,
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

  const saveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          report_content: reportForm.report_content.trim() || null,
          report_image_url: reportForm.report_image_url.trim() || null,
          report_attachments: reportAttachments,
          report_needs_review: false,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report saved");
      setReportOpenId(null);
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
        campaign's end date passes, its report is flagged for review here — nobody can write a
        first-hand account before the event actually happens.
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
                <Label htmlFor="c-location">Location</Label>
                <Input
                  id="c-location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Uhuru Park, Nairobi"
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
                <Label>Main banner (optional)</Label>
                <div className="mt-2">
                  <ImageUploadField
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
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
              <div>
                <Label>More media (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extra photos or promo videos for the event, beyond the main banner.
                </p>
                <div className="mt-2">
                  <AttachmentsField value={attachments} onChange={setAttachments} />
                </div>
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
              className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              {c.image_url ? (
                <img src={c.image_url} alt="" className="size-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                  <Megaphone className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                    {status}
                  </Badge>
                  {c.report_needs_review ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" /> Report needs review
                    </Badge>
                  ) : null}
                  <p className="truncate font-semibold">{c.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {longDate(c.start_date)} – {longDate(c.end_date)}
                  {c.location ? ` · ${c.location}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(c.id)}>
                Edit event
              </Button>
              <Dialog
                open={reportOpenId === c.id}
                onOpenChange={(v) => setReportOpenId(v ? c.id : null)}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => openReport(c.id)}>
                    Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Report: {c.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Shown on the public campaigns page once the event is over. Defaults to the
                      event description until an editor writes up what actually happened.
                    </p>
                    <div>
                      <Label>Report banner (optional)</Label>
                      <div className="mt-2">
                        <ImageUploadField
                          value={reportForm.report_image_url}
                          onChange={(url) =>
                            setReportForm({ ...reportForm, report_image_url: url })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="c-report">Report body</Label>
                      <RichTextEditor
                        id="c-report"
                        rows={8}
                        value={reportForm.report_content}
                        onChange={(v) => setReportForm({ ...reportForm, report_content: v })}
                        placeholder="How the campaign actually went, with photos or a video from the toolbar."
                      />
                    </div>
                    <div>
                      <Label>More media (optional)</Label>
                      <div className="mt-2">
                        <AttachmentsField
                          value={reportAttachments}
                          onChange={setReportAttachments}
                        />
                      </div>
                    </div>
                    <Button disabled={saveReport.isPending} onClick={() => saveReport.mutate(c.id)}>
                      Save report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
