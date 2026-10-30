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
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { PartyCasualtyInputs, type CasualtyBreakdown, casualtyBreakdownError, withUnspecifiedCasualties } from "@/components/site/party-casualty-inputs";
import { AttachmentsField, type Attachment } from "@/components/site/attachments-field";
import { PARTIES_INVOLVED } from "@/lib/constants";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { findExistingRoad } from "@/lib/roads";
import { submitAccidentReport } from "@/lib/report.functions";
import { IncidentRelationshipPanel } from "@/components/site/incident-relationship-panel";
import { CrossContentEditor } from "@/components/site/cross-content-editor";

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
    featured: Boolean(record.featured),
  };
  if (type === "article") return { ...common, category: stringValue(record, "category"), categories: Array.isArray(record.categories) ? record.categories : [], seo_title: stringValue(record, "seo_title"), seo_description: stringValue(record, "seo_description"), seo_keywords: stringValue(record, "seo_keywords") };
  if (type === "report") return { ...common, summary: stringValue(record, "summary"), county: stringValue(record, "county"), road: stringValue(record, "road"), incident_type: stringValue(record, "incident_type"), severity: stringValue(record, "severity"), occurred_at: stringValue(record, "occurred_at"), latitude: typeof record.latitude === "number" ? record.latitude : null, longitude: typeof record.longitude === "number" ? record.longitude : null, vehicles_involved: record.vehicles_involved ?? null, casualties: record.casualties ?? null, fatalities: record.fatalities ?? null, parties_involved: Array.isArray(record.parties_involved) ? record.parties_involved : [], casualty_breakdown: (record.casualty_breakdown ?? {}) as CasualtyBreakdown, attachments: (Array.isArray(record.attachments) ? record.attachments : []) as Attachment[], seo_title: stringValue(record, "seo_title"), seo_description: stringValue(record, "seo_description"), seo_keywords: stringValue(record, "seo_keywords") };
  if (type === "alert") return { ...common, summary: stringValue(record, "summary"), description: stringValue(record, "description"), county: stringValue(record, "county"), road: stringValue(record, "road"), hazard_type: stringValue(record, "hazard_type"), severity: stringValue(record, "severity") };
  if (type === "infrastructure") return { ...common, road_name: stringValue(record, "road_name"), road_scope: stringValue(record, "road_scope") || "county", county: stringValue(record, "county"), authority: stringValue(record, "authority"), structure_type: stringValue(record, "structure_type") };
  return { ...common, description: stringValue(record, "description"), location: stringValue(record, "location"), start_date: stringValue(record, "start_date"), end_date: stringValue(record, "end_date") };
}

export function EditorialRecordEditor({ type, id }: { type: EditorialRecordType; id?: string }) {
  const config = CONFIG[type];
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { canReview } = useRoles();
  const { identity } = useActiveIdentity();
  const [form, setForm] = useState<RecordValue | null>(() => isEditing ? null : initialForm(type, {}));
  const recordQuery = useQuery({
    queryKey: ["admin-editorial-record", type, id],
    enabled: isEditing,
    queryFn: async () => {
      const { data, error } = await (supabase.from(config.table) as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as RecordValue;
    },
  });
  const summarySchemaQuery = useQuery({
    queryKey: ["editorial-summary-schema", type],
    enabled: type === "report" || type === "alert",
    queryFn: async () => {
      const { error } = await (supabase.from(config.table) as any).select("summary").limit(1);
      return !error;
    },
  });
  const summarySupported = type !== "report" && type !== "alert" ? true : summarySchemaQuery.data === true;

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
    mutationFn: async (requestedStatus?: "draft" | "approved") => {
      if (!form) throw new Error("Record is still loading");
      if (type === "report" && !form.title.trim()) throw new Error("Report title is required");
      if (type === "report" && !form.body.trim()) throw new Error("Incident description is required");
      if (type === "report" && !form.county.trim()) throw new Error("County is required");
      if (type === "report" && !form.occurred_at) throw new Error("Occurrence date and time are required");
      if (type === "report") {
        const breakdownError = casualtyBreakdownError(form.casualty_breakdown, { dead: form.fatalities, injured: form.casualties });
        if (breakdownError) throw new Error(breakdownError);
      }
      let payload: RecordValue;
      if (type === "article") {
        payload = {
          title: form.title, summary: form.summary, body: form.body,
          image_url: form.image_url.trim() || null, image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null, image_credit: form.image_credit.trim() || null,
          category: form.category, categories: form.categories,
          featured: form.featured,
          seo_title: form.seo_title, seo_description: form.seo_description, seo_keywords: form.seo_keywords,
        };
      } else if (type === "report") {
        payload = {
          title: form.title, ...(summarySupported ? { summary: form["summary"].trim() || null } : {}), description: form.body, county: form.county, road: form.road,
          incident_type: form.incident_type || null, severity: form.severity,
          occurred_at: form.occurred_at, latitude: form.latitude, longitude: form.longitude,
          vehicles_involved: form.vehicles_involved, casualties: form.casualties, fatalities: form.fatalities,
          parties_involved: form.parties_involved, casualty_breakdown: form.casualty_breakdown,
          attachments: form.attachments, seo_title: form.seo_title || null,
          seo_description: form.seo_description || null, seo_keywords: form.seo_keywords || null,
          featured: form.featured,
          image_url: form.image_url.trim() || null, image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null, image_credit: form.image_credit.trim() || null,
        };
      } else if (type === "alert") {
        payload = {
          title: form.title, ...(summarySupported ? { summary: form["summary"].trim() || null } : {}), description: form.description, county: form.county, road: form.road,
          hazard_type: form.hazard_type, severity: form.severity,
          featured: form.featured,
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
      const status = requestedStatus === "approved" && canReview ? "approved" : undefined;
      if (isEditing) {
        const patch = status ? { ...payload, status } : payload;
        const { error } = await (supabase.from(config.table) as any).update(patch).eq("id", id);
        if (error) throw error;
      } else if (type === "report") {
        const road_id = await findExistingRoad(form.road);
        await submitAccidentReport({ data: {
          title: form.title,
          ...(summarySupported ? { summary: form["summary"].trim() || null } : {}),
          description: form.body,
          county: form.county,
          road: form.road,
          incident_type: form.incident_type || null,
          severity: form.severity,
          occurred_at: new Date(form.occurred_at).toISOString(),
          vehicles_involved: form.vehicles_involved,
          casualties: form.casualties,
          fatalities: form.fatalities,
          latitude: form.latitude,
          longitude: form.longitude,
          image_url: form.image_url.trim() || null,
          image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null,
          image_credit: form.image_credit.trim() || null,
          road_id,
          parties_involved: form.parties_involved,
          casualty_breakdown: withUnspecifiedCasualties(form.casualty_breakdown, { dead: form.fatalities, injured: form.casualties }),
          attachments: form.attachments,
          page_id: identity.type === "page" ? identity.pageId : null,
          is_anonymous: false,
          requestedStatus: status === "approved" ? "approved" : "pending",
        } });
      } else {
        const insertPayload = {
          ...payload,
          user_id: user?.id ?? null,
          status: status === "approved" ? "approved" : "pending",
        };
        const { error } = await (supabase.from(config.table) as any).insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => toast.success(isEditing ? `${config.label} saved. Existing media and fields were preserved.` : `${config.label} created as a draft.`),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isEditing && recordQuery.error) return <p className="rounded-lg border border-destructive/30 p-6 text-destructive">Unable to load this {config.label.toLowerCase()}.</p>;
  if (isEditing && (recordQuery.isLoading || !form)) return <p className="p-8 text-muted-foreground">Loading {config.label.toLowerCase()}…</p>;
  if (!form) return <p className="p-8 text-muted-foreground">Preparing {config.label.toLowerCase()}…</p>;

  const aiActions = [
    { mode: "generate" as const, provider: "grok" as const },
    { mode: "autopopulate" as const, provider: "groq" as const },
    { mode: "autopopulate" as const, provider: "grok" as const },
    ...(isEditing ? [{ mode: "update" as const, provider: "grok" as const }] : []),
  ];

  return <div className="w-full max-w-4xl space-y-6">
    <Link to={config.back} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue"><ArrowLeft className="size-4" /> Back to {config.label.toLowerCase()}s</Link>
    <AdminPageHeader eyebrow="Editorial workspace" title={`${isEditing ? "Edit" : "New"} ${config.label}`} description={isEditing ? "Complete record editor. Existing values and media remain intact unless you change them." : "Create a structured record. Save a draft or publish when your role permits."} websiteHref={config.list} />
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <section className="space-y-3" aria-labelledby="editorial-ai-heading">
        <h2 id="editorial-ai-heading" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Editorial AI</h2>
        {aiActions.map(({ mode, provider }) => <EditorialAIButton key={`${mode}-${provider}`} contentType={type} mode={mode} provider={provider} contentId={id} current={aiCurrent} source="" onDraft={applyDraft} />)}
      </section>
      {type === "article" || type === "report" || type === "alert" ? (
        <section className="rounded border border-dashed border-border bg-muted/30 p-3" aria-labelledby="editorial-selection-heading">
          <h2 id="editorial-selection-heading" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Editorial selection</h2>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(form.featured)}
              onCheckedChange={(checked) => set("featured", checked === true)}
            />
            <span>
              <strong>Featured {config.label}</strong>
              <span className="ml-1 text-xs text-muted-foreground">editor-selected public coverage</span>
            </span>
          </label>
        </section>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="editor-title">Title</Label><Input id="editor-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
        {type === "article" || type === "infrastructure" || type === "report" || type === "alert" ? <div className="sm:col-span-2"><Label htmlFor="editor-summary">Editorial summary</Label>{type === "report" || type === "alert" ? <p className="mb-1 text-xs text-muted-foreground">{summarySupported ? "Saved independently from the full content." : "Summary storage activates after the reviewed summary migration is applied; other fields remain safe to save."}</p> : null}<Textarea id="editor-summary" disabled={!summarySupported} maxLength={240} placeholder="Concise factual summary (normally 20 words or fewer)" value={form["summary"]} onChange={(e) => set("summary", e.target.value)} /></div> : null}
        {type === "alert" ? <div className="sm:col-span-2"><Label htmlFor="editor-description">Advisory content</Label><RichTextEditor id="editor-description" value={form.description} onChange={(value) => set("description", value)} /></div> : <div className="sm:col-span-2"><Label htmlFor="editor-body">Full content</Label><RichTextEditor id="editor-body" value={form.body} onChange={(value) => set("body", value)} /></div>}
        {type === "article" ? <><div><Label>Category</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></div><div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} /></div></> : null}
        {type === "alert" || type === "report" ? <><div><Label>County</Label><Input value={form.county} onChange={(e) => set("county", e.target.value)} /></div><div><Label>Road / location</Label><Input value={form.road} onChange={(e) => set("road", e.target.value)} /></div><div><Label>Severity</Label><Input value={form.severity} onChange={(e) => set("severity", e.target.value)} /></div></> : null}
        {type === "report" ? <>
          <div className="sm:col-span-2 border-t border-border pt-4"><h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Incident details</h2></div>
          <div><Label>Incident type</Label><Input value={form.incident_type} onChange={(e) => set("incident_type", e.target.value)} /></div>
          <div><Label>Incident date/time</Label><Input type="datetime-local" value={form.occurred_at?.slice(0, 16)} onChange={(e) => set("occurred_at", e.target.value)} /></div>
          <div><Label>Latitude</Label><Input type="number" value={form.latitude ?? ""} onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))} /></div>
          <div><Label>Longitude</Label><Input type="number" value={form.longitude ?? ""} onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))} /></div>
          {([['vehicles_involved', 'Vehicles involved'], ['casualties', 'Confirmed injuries'], ['fatalities', 'Confirmed fatalities']] as const).map(([key, label]) => <div key={key}><Label>{label}</Label><Input type="number" min="0" value={form[key] ?? ""} onChange={(e) => set(key, e.target.value === "" ? null : Number(e.target.value))} /></div>)}
          <div className="sm:col-span-2 border-t border-border pt-4"><h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Vehicles, road users and casualties</h2></div>
          <div className="sm:col-span-2"><Label>Road-user categories involved</Label><div className="mt-2 flex flex-wrap gap-3">{PARTIES_INVOLVED.map((party) => <label key={party.value} className="flex items-center gap-2 text-sm"><Checkbox checked={form.parties_involved.includes(party.value)} onCheckedChange={(checked) => set("parties_involved", checked === true ? [...form.parties_involved, party.value] : form.parties_involved.filter((value: string) => value !== party.value))} />{party.label}</label>)}</div><PartyCasualtyInputs parties={form.parties_involved} value={form.casualty_breakdown} onChange={(value) => set("casualty_breakdown", value)} /><p className="mt-2 text-xs text-muted-foreground">Leave casualty fields blank when the source does not confirm a figure; blank is unknown, not zero.</p></div>
          <div className="sm:col-span-2"><Label>Supporting media</Label><AttachmentsField value={form.attachments} onChange={(value) => set("attachments", value)} /></div>
          <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} /></div><div><Label>SEO description</Label><Input value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} /></div><div className="sm:col-span-2"><Label>SEO keywords</Label><Input value={form.seo_keywords} onChange={(e) => set("seo_keywords", e.target.value)} /></div>
        </> : null}
        {type === "infrastructure" ? <><div><Label>Road name</Label><Input value={form.road_name} onChange={(e) => set("road_name", e.target.value)} /></div><div><Label>County</Label><Input value={form.county} onChange={(e) => set("county", e.target.value)} /></div><div><Label>Road scope</Label><Select value={form.road_scope} onValueChange={(value) => set("road_scope", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="county">County road</SelectItem><SelectItem value="national">National road</SelectItem></SelectContent></Select></div></> : null}
        {type === "campaign" ? <><div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div><div><Label>Start date</Label><Input type="datetime-local" value={form.start_date?.slice(0, 16)} onChange={(e) => set("start_date", e.target.value)} /></div><div><Label>End date</Label><Input type="datetime-local" value={form.end_date?.slice(0, 16)} onChange={(e) => set("end_date", e.target.value)} /></div></> : null}
      </section>
      <section className="space-y-3 border-t border-border pt-5"><h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Featured image and attribution</h2><ImageUploadField value={form.image_url} onChange={(value) => set("image_url", value)} /><div className="grid gap-4 sm:grid-cols-2"><div><Label>Alt text</Label><Input value={form.image_alt} onChange={(e) => set("image_alt", e.target.value)} /></div><div><Label>Caption</Label><Input value={form.image_caption} onChange={(e) => set("image_caption", e.target.value)} /></div><div className="sm:col-span-2"><Label>Source / credit</Label><Input value={form.image_credit} onChange={(e) => set("image_credit", e.target.value)} /></div></div></section>
      {isEditing && (type === "report" || type === "alert") ? <IncidentRelationshipPanel /> : null}
      {isEditing ? <CrossContentEditor sourceType={type} sourceId={id!} sourceRecord={recordQuery.data ?? {}} /> : null}
      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><div><Label>Status</Label><p className="text-sm capitalize text-muted-foreground">{String(form.status).replace("_", " ")}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => save.mutate("draft")} disabled={save.isPending}><Save className="mr-2 size-4" />{save.isPending ? "Saving…" : isEditing ? "Save changes" : "Save draft"}</Button>{canReview ? <Button type="button" onClick={() => save.mutate("approved")} disabled={save.isPending}>{isEditing ? "Save & publish" : "Publish report"}</Button> : null}</div></section>
    </div>
  </div>;
}
