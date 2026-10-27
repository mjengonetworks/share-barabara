import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export type EditorialRecordType = "article" | "alert" | "report" | "campaign" | "infrastructure";

const CONFIG: Record<EditorialRecordType, { table: string; label: string; back: string; list: string }> = {
  article: { table: "news", label: "Article", back: "/admin/articles", list: "/news" },
  alert: { table: "alerts", label: "Alert", back: "/admin/alerts", list: "/alerts" },
  report: { table: "accident_reports", label: "Accident report", back: "/admin/reports", list: "/reports" },
  campaign: { table: "campaigns", label: "Campaign", back: "/admin/campaigns", list: "/campaigns" },
  infrastructure: { table: "infrastructure_issues", label: "Infrastructure issue", back: "/admin/infrastructure-issues", list: "/infrastructure-issues" },
};

type RecordValue = Record<string, any>;

function stringValue(record: RecordValue, key: string) {
  return typeof record[key] === "string" ? record[key] : "";
}

function initialForm(type: EditorialRecordType, record: RecordValue): RecordValue {
  const common = {
    title: stringValue(record, "title"),
    summary: stringValue(record, "summary"),
    body: stringValue(record, type === "article" ? "body" : type === "report" ? "description" : "content"),
    image_url: stringValue(record, type === "campaign" ? "image_url" : "image_url"),
    image_alt: stringValue(record, "image_alt"),
    image_caption: stringValue(record, "image_caption"),
    image_credit: stringValue(record, "image_credit"),
    status: stringValue(record, "status") || "draft",
  };
  if (type === "article") return { ...common, category: stringValue(record, "category"), categories: Array.isArray(record.categories) ? record.categories : [], seo_title: stringValue(record, "seo_title"), seo_description: stringValue(record, "seo_description"), seo_keywords: stringValue(record, "seo_keywords") };
  if (type === "report") return { ...common, county: stringValue(record, "county"), road: stringValue(record, "road"), incident_type: stringValue(record, "incident_type"), severity: stringValue(record, "severity"), occurred_at: stringValue(record, "occurred_at"), vehicles_involved: record.vehicles_involved ?? null, casualties: record.casualties ?? null, fatalities: record.fatalities ?? null };
  if (type === "alert") return { ...common, description: stringValue(record, "description"), county: stringValue(record, "county"), road: stringValue(record, "road"), hazard_type: stringValue(record, "hazard_type"), severity: stringValue(record, "severity") };
  if (type === "infrastructure") return { ...common, road_name: stringValue(record, "road_name"), road_scope: stringValue(record, "road_scope") || "county", county: stringValue(record, "county"), authority: stringValue(record, "authority"), structure_type: stringValue(record, "structure_type") };
  return { ...common, description: stringValue(record, "description"), location: stringValue(record, "location"), start_date: stringValue(record, "start_date"), end_date: stringValue(record, "end_date") };
}

export function EditorialRecordEditor({ type, id }: { type: EditorialRecordType; id: string }) {
  const config = CONFIG[type];
  const [form, setForm] = useState<RecordValue | null>(null);
  const recordQuery = useQuery({
    queryKey: ["admin-editorial-record", type, id],
    queryFn: async () => {
      const { data, error } = await (supabase.from(config.table) as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as RecordValue;
    },
  });

  useEffect(() => {
    if (recordQuery.data) setForm(initialForm(type, recordQuery.data));
  }, [recordQuery.data, type]);

  const aiCurrent = useMemo(() => form ?? {}, [form]);
  const set = (key: string, value: any) => setForm((current) => current ? { ...current, [key]: value } : current);
  const applyDraft = (draft: Record<string, unknown>) => setForm((current) => {
    if (!current) return current;
    const next = { ...current };
    for (const [key, value] of Object.entries(draft)) {
      if (key in next && value !== null && value !== undefined && value !== "" && (!(typeof value === "string") || value.trim())) next[key] = value;
    }
    return next;
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Record is still loading");
      let payload: RecordValue;
      if (type === "article") {
        payload = {
          title: form.title, summary: form.summary, body: form.body,
          image_url: form.image_url.trim() || null, image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null, image_credit: form.image_credit.trim() || null,
          category: form.category, categories: form.categories,
          seo_title: form.seo_title, seo_description: form.seo_description, seo_keywords: form.seo_keywords,
        };
      } else if (type === "report") {
        payload = {
          title: form.title, description: form.body, county: form.county, road: form.road,
          incident_type: form.incident_type || null, severity: form.severity,
          occurred_at: form.occurred_at, vehicles_involved: form.vehicles_involved,
          casualties: form.casualties, fatalities: form.fatalities,
          image_url: form.image_url.trim() || null, image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null, image_credit: form.image_credit.trim() || null,
        };
      } else if (type === "alert") {
        payload = {
          title: form.title, description: form.description, county: form.county, road: form.road,
          hazard_type: form.hazard_type, severity: form.severity,
          image_url: form.image_url.trim() || null, image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null, image_credit: form.image_credit.trim() || null,
        };
      } else if (type === "infrastructure") {
        payload = {
          title: form.title, road_name: form.road_name, road_scope: form.road_scope,
          county: form.county, authority: form.authority, structure_type: form.structure_type,
          summary: form.summary, content: form.body, image_url: form.image_url.trim() || null,
          image_alt: form.image_alt.trim() || null, image_caption: form.image_caption.trim() || null,
          image_credit: form.image_credit.trim() || null,
        };
      } else {
        payload = {
          title: form.title, description: form.body, location: form.location,
          start_date: form.start_date, end_date: form.end_date, image_url: form.image_url.trim() || null,
          image_alt: form.image_alt.trim() || null, image_caption: form.image_caption.trim() || null,
          image_credit: form.image_credit.trim() || null,
        };
      }
      const { error } = await (supabase.from(config.table) as any).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success(`${config.label} saved. Existing media and fields were preserved.`),
    onError: (error: Error) => toast.error(error.message),
  });

  if (recordQuery.error) return <p className="rounded-lg border border-destructive/30 p-6 text-destructive">Unable to load this {config.label.toLowerCase()}.</p>;
  if (recordQuery.isLoading || !form) return <p className="p-8 text-muted-foreground">Loading {config.label.toLowerCase()}…</p>;

  const aiActions = [
    { mode: "generate" as const, provider: "grok" as const },
    { mode: "autopopulate" as const, provider: "groq" as const },
    { mode: "autopopulate" as const, provider: "grok" as const },
    { mode: "update" as const, provider: "grok" as const },
  ];

  return <div className="w-full max-w-4xl space-y-6">
    <Link to={config.back} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue"><ArrowLeft className="size-4" /> Back to {config.label.toLowerCase()}s</Link>
    <AdminPageHeader eyebrow="Editorial workspace" title={`Edit ${config.label}`} description="Complete record editor. Existing values and media remain intact unless you change them." websiteHref={config.list} />
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <section className="space-y-3" aria-labelledby="editorial-ai-heading">
        <h2 id="editorial-ai-heading" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Editorial AI</h2>
        {aiActions.map(({ mode, provider }) => <EditorialAIButton key={`${mode}-${provider}`} contentType={type} mode={mode} provider={provider} contentId={id} current={aiCurrent} source="" onDraft={applyDraft} />)}
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="editor-title">Title</Label><Input id="editor-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
        {type === "article" || type === "infrastructure" ? <div className="sm:col-span-2"><Label htmlFor="editor-summary">Summary</Label><Textarea id="editor-summary" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></div> : null}
        {type === "alert" ? <div className="sm:col-span-2"><Label htmlFor="editor-description">Advisory content</Label><RichTextEditor id="editor-description" value={form.description} onChange={(value) => set("description", value)} /></div> : <div className="sm:col-span-2"><Label htmlFor="editor-body">Full content</Label><RichTextEditor id="editor-body" value={form.body} onChange={(value) => set("body", value)} /></div>}
        {type === "article" ? <><div><Label>Category</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></div><div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} /></div></> : null}
        {type === "alert" || type === "report" ? <><div><Label>County</Label><Input value={form.county} onChange={(e) => set("county", e.target.value)} /></div><div><Label>Road / location</Label><Input value={form.road} onChange={(e) => set("road", e.target.value)} /></div><div><Label>Severity</Label><Input value={form.severity} onChange={(e) => set("severity", e.target.value)} /></div></> : null}
        {type === "report" ? <><div><Label>Incident type</Label><Input value={form.incident_type} onChange={(e) => set("incident_type", e.target.value)} /></div><div><Label>Incident date/time</Label><Input type="datetime-local" value={form.occurred_at?.slice(0, 16)} onChange={(e) => set("occurred_at", e.target.value)} /></div></> : null}
        {type === "infrastructure" ? <><div><Label>Road name</Label><Input value={form.road_name} onChange={(e) => set("road_name", e.target.value)} /></div><div><Label>County</Label><Input value={form.county} onChange={(e) => set("county", e.target.value)} /></div><div><Label>Road scope</Label><Select value={form.road_scope} onValueChange={(value) => set("road_scope", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="county">County road</SelectItem><SelectItem value="national">National road</SelectItem></SelectContent></Select></div></> : null}
        {type === "campaign" ? <><div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div><div><Label>Start date</Label><Input type="datetime-local" value={form.start_date?.slice(0, 16)} onChange={(e) => set("start_date", e.target.value)} /></div><div><Label>End date</Label><Input type="datetime-local" value={form.end_date?.slice(0, 16)} onChange={(e) => set("end_date", e.target.value)} /></div></> : null}
      </section>
      <section className="space-y-3 border-t border-border pt-5"><h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Featured image and attribution</h2><ImageUploadField value={form.image_url} onChange={(value) => set("image_url", value)} /><div className="grid gap-4 sm:grid-cols-2"><div><Label>Alt text</Label><Input value={form.image_alt} onChange={(e) => set("image_alt", e.target.value)} /></div><div><Label>Caption</Label><Input value={form.image_caption} onChange={(e) => set("image_caption", e.target.value)} /></div><div className="sm:col-span-2"><Label>Source / credit</Label><Input value={form.image_credit} onChange={(e) => set("image_credit", e.target.value)} /></div></div></section>
      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><div><Label>Status</Label><p className="text-sm capitalize text-muted-foreground">{String(form.status).replace("_", " ")}</p></div><Button type="button" onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 size-4" />{save.isPending ? "Saving…" : "Save changes"}</Button></section>
    </div>
  </div>;
}
