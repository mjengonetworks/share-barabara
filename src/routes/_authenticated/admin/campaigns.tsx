import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Megaphone, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { AttachmentsField, attachmentsForScope, replaceAttachmentScope, type Attachment } from "@/components/site/attachments-field";
import { supabase } from "@/integrations/supabase/client";
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { campaignStatus } from "@/lib/campaigns";
import { longDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListingHeader, AdminListingRow, AdminListingSurface } from "@/components/admin/admin-listing-surface";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns: Share Barabara Admin" }] }),
  component: CampaignsAdminPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ongoing: "default",
  upcoming: "secondary",
  previous: "outline",
};

type ReportForm = {
  report_content: string;
  report_image_url: string;
  report_published: boolean;
};

function CampaignsAdminPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (/^\/admin\/campaigns\/(?:new|[^/]+\/edit)\/?$/.test(pathname)) return <Outlet />;
  const queryClient = useQueryClient();
  const [reportOpenId, setReportOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reportForm, setReportForm] = useState<ReportForm>({
    report_content: "",
    report_image_url: "",
    report_published: false,
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

  const visibleCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const status = campaignStatus(campaign.start_date, campaign.end_date);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (query && !campaign.title.toLowerCase().includes(query) && !(campaign.location ?? "").toLowerCase().includes(query)) return false;
      return true;
    });
  }, [campaigns, search, statusFilter]);

  const openReport = (id: string) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setReportOpenId(id);
    setReportForm({
      report_content: c.report_content ?? "",
      report_image_url: c.report_image_url ?? c.image_url ?? "",
      report_published: c.report_published,
    });
    setReportAttachments(((c.report_attachments as Attachment[] | null) ?? []) as Attachment[]);
  };

  const saveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          report_content: reportForm.report_content.trim() || null,
          report_image_url: reportForm.report_image_url.trim() || null,
          report_attachments: reportAttachments,
          report_published: reportForm.report_published,
          report_needs_review: false,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(reportForm.report_published ? "Report saved and published" : "Report saved");
      setReportOpenId(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await moveToRecycleBin("campaign", id, "Removed by an administrator");
    },
    onSuccess: () => {
      toast.success("Campaign removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-full max-w-[1500px]">
      <AdminPageHeader
        eyebrow="Site content"
        title="Manage Campaigns"
        websiteHref="/campaigns"
        actions={<a className={buttonVariants({ size: "sm" })} href="/admin/campaigns/new"><Plus className="mr-1.5 size-4" /> Add New Campaign</a>}
        description={
          <>
        Status (upcoming / ongoing / previous) is derived automatically from the dates. Once a
        campaign's end date passes, it's hidden from the public until its report is written and
        published here — nobody can write a first-hand account before the event actually happens,
        and a lapsed campaign with no published report just won't appear on the site.
          </>
        }
      />

      <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="previous">Previous</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="campaign-search">Search</Label>
          <Input id="campaign-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or location…" />
        </div>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <AdminListingSurface>
        <AdminListingHeader className="grid-cols-[auto_48px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)_minmax(6rem,auto)]"><span>Image</span><span>Title</span><span>Location</span><span>Status</span><span>Dates</span><span>Actions</span></AdminListingHeader>
      <ul className="divide-y divide-border/70">
        {visibleCampaigns.map((c) => {
          const status = campaignStatus(c.start_date, c.end_date);
          const openActions = () => document.getElementById(`campaign-actions-${c.id}`)?.click();
          return (
            <AdminListingRow
              key={c.id}
              onActivate={openActions}
            >
              <div className="grid min-w-[900px] grid-cols-[20px_40px_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,.8fr)_minmax(0,1fr)_40px] items-center gap-1.5">
              <input type="checkbox" aria-label={`Select ${c.title}`} className="size-4 accent-brand-blue" />
              {c.image_url ? (
                <img src={c.image_url} alt="" className="h-12 w-[70px] shrink-0 rounded object-cover" />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                  <Megaphone className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                    {status}
                  </Badge>
                  {c.report_needs_review ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" /> Report needs review
                    </Badge>
                  ) : null}
                  {status === "previous" ? (
                    <Badge variant={c.report_published ? "default" : "outline"}>
                      {c.report_published ? "Report published" : "Not visible to public yet"}
                    </Badge>
                  ) : null}
                  <p className="line-clamp-2 font-semibold">{c.title}</p>
                </div>
              </div>
              <span className="truncate text-sm">{c.location || "—"}</span>
              <span className="text-xs font-semibold capitalize text-muted-foreground">{status}</span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{longDate(c.start_date)} – {longDate(c.end_date)}</span>
              <div className="flex flex-wrap items-center justify-self-end gap-1">
              <Dialog
                open={reportOpenId === c.id}
                onOpenChange={(v) => setReportOpenId(v ? c.id : null)}
              >
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit report for ${c.title}`} onClick={() => openReport(c.id)}>
                    <Pencil className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Report: {c.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Hidden from the public until the event is over AND you tick "Published" below
                      — a lapsed campaign with no published report simply won't appear on the site.
                      Starts blank when no report content exists, so you can decide what should become a report.
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
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={reportForm.report_published}
                        onCheckedChange={(v) =>
                          setReportForm({ ...reportForm, report_published: v === true })
                        }
                      />
                      Published (visible to the public once the event is over)
                    </label>
                    <AttachmentsField
                      title="More Photos and Videos"
                      description="Add supporting images or videos for the campaign report."
                      scope="media"
                      value={attachmentsForScope(reportAttachments, "media")}
                      onChange={(value) => setReportAttachments(replaceAttachmentScope(reportAttachments, "media", value))}
                    />
                    <Button disabled={saveReport.isPending} onClick={() => saveReport.mutate(c.id)}>
                      {reportForm.report_published ? "Save & publish" : "Save draft"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button id={`campaign-actions-${c.id}`} data-row-action="true" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${c.title}`}>
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openReport(c.id)}>Report</DropdownMenuItem>
                  <DropdownMenuItem asChild><a href={`/admin/campaigns/${c.id}/edit`}>Edit campaign</a></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => remove.mutate(c.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
              </div>
            </AdminListingRow>
          );
        })}
        {!isLoading && visibleCampaigns.length === 0 ? (
          <p className="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No campaigns yet.
          </p>
        ) : null}
      </ul>
      </AdminListingSurface>
    </div>
  );
}
