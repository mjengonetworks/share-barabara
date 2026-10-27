import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PartyCasualtyInputs,
  type CasualtyBreakdown,
  withUnspecifiedCasualties,
  casualtyBreakdownError,
} from "@/components/site/party-casualty-inputs";
import { NullableNumberField } from "@/components/site/nullable-number-field";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { AttachmentsField, type Attachment } from "@/components/site/attachments-field";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { KENYA_COUNTIES, PARTIES_INVOLVED } from "@/lib/constants";
import { useReportSeverities } from "@/hooks/useTaxonomy";
import { useIncidentTaxonomy, useReportIncidentTypeSchema } from "@/hooks/useIncidentTaxonomy";
import { findExistingRoad } from "@/lib/roads";
import { RoadInput } from "@/components/site/road-input";
import { LocationButton } from "@/components/site/location-button";
import { submitAccidentReport } from "@/lib/report.functions";
import { useRoles } from "@/hooks/useRoles";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";

export function ReportForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const { canReview } = useRoles();
  const queryClient = useQueryClient();
  const { identity } = useActiveIdentity();
  const { data: severities = [] } = useReportSeverities();
  const { data: incidentTypes = [] } = useIncidentTaxonomy();
  const { data: reportIncidentTypeAvailable = false } = useReportIncidentTypeSchema();
  const [anonymous, setAnonymous] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    county: "Nairobi",
    road: "",
    incident_type: "",
    severity: "minor",
    occurred_at: new Date().toISOString().slice(0, 16),
    vehicles_involved: null as number | null,
    casualties: null as number | null,
    fatalities: null as number | null,
    latitude: null as number | null,
    longitude: null as number | null,
    image_url: "",
    image_alt: "",
    image_caption: "",
    image_credit: "",
  });
  const [partiesInvolved, setPartiesInvolved] = useState<string[]>([]);
  const [casualtyBreakdown, setCasualtyBreakdown] = useState<CasualtyBreakdown>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const submit = useMutation({
    mutationFn: async (requestedStatus: "pending" | "approved") => {
      if (!user) throw new Error("Sign in required");
      const breakdownError = casualtyBreakdownError(casualtyBreakdown, {
        dead: form.fatalities,
        injured: form.casualties,
      });
      if (breakdownError) throw new Error(breakdownError);
      const road_id = await findExistingRoad(form.road);
      return submitAccidentReport({
        data: {
          ...form,
          requestedStatus,
          ...(reportIncidentTypeAvailable ? { incident_type: form.incident_type || null } : {}),
          image_url: form.image_url.trim() || null,
          image_alt: form.image_alt.trim() || null,
          image_caption: form.image_caption.trim() || null,
          image_credit: form.image_credit.trim() || null,
          road_id,
          parties_involved: partiesInvolved,
          casualty_breakdown: withUnspecifiedCasualties(casualtyBreakdown, {
            dead: form.fatalities,
            injured: form.casualties,
          }),
          attachments,
          occurred_at: new Date(form.occurred_at).toISOString(),
          user_id: user.id,
          page_id: identity.type === "page" ? identity.pageId : null,
          is_anonymous: identity.type === "profile" && anonymous,
        },
      });
    },
    onSuccess: (result) => {
      toast.success(
        result.status === "approved"
          ? "Report published"
          : "Report submitted for review, an editor will verify it before it is published",
      );
      setForm({
        ...form,
        title: "",
        description: "",
        road: "",
        incident_type: "",
        latitude: null,
        longitude: null,
        image_url: "",
        image_alt: "",
        image_caption: "",
        image_credit: "",
      });
      setPartiesInvolved([]);
      setCasualtyBreakdown({});
      setAttachments([]);
      setAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <div>
        <Label htmlFor="r-title">Title</Label>
        <Input
          id="r-title"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="A short description of the incident"
        />
      </div>
      <div>
        <Label htmlFor="r-desc">Content / What happened?</Label>
        <Textarea
          id="r-desc"
          required
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe what happened, where it happened and any immediate safety information."
        />
      </div>
      <div>
        <Label>Attachments</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Add photos or evidence files that help explain the incident.
        </p>
        <div className="mt-2">
          <AttachmentsField value={attachments} onChange={setAttachments} />
        </div>
      </div>
      <Collapsible>
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/50">
          <span>Additional details (optional)</span>
          <ChevronDown
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>County</Label>
              <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {KENYA_COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RoadInput
              value={form.road}
              onChange={(v) => setForm({ ...form, road: v })}
              id="r-road"
              label="Road or location"
            />
            <div className="sm:col-span-2">
              <LocationButton
                latitude={form.latitude}
                longitude={form.longitude}
                onLocate={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
              />
            </div>
            <div>
              <Label htmlFor="r-when">When did it happen?</Label>
              <Input
                id="r-when"
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severities.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reportIncidentTypeAvailable ? (
              <div className="sm:col-span-2">
                <Label>Incident classification (optional)</Label>
                <Select
                  value={form.incident_type || "unclassified"}
                  onValueChange={(value) =>
                    setForm({ ...form, incident_type: value === "unclassified" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="unclassified">No specific classification</SelectItem>
                    {incidentTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.parent_value
                          ? `${incidentTypes.find((parent) => parent.value === item.parent_value)?.label ?? item.parent_value} · `
                          : ""}
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Classification is optional and does not determine severity.
                </p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NullableNumberField
              id="r-veh"
              label="Vehicles involved"
              value={form.vehicles_involved}
              onChange={(value) => setForm({ ...form, vehicles_involved: value })}
            />
            <NullableNumberField
              id="r-cas"
              label="Injured"
              value={form.casualties}
              onChange={(value) => setForm({ ...form, casualties: value })}
            />
            <NullableNumberField
              id="r-fat"
              label="Fatalities"
              value={form.fatalities}
              onChange={(value) => setForm({ ...form, fatalities: value })}
            />
          </div>
          <div>
            <Label>Who was involved (optional)</Label>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {PARTIES_INVOLVED.map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={partiesInvolved.includes(p.value)}
                    onCheckedChange={(v) =>
                      setPartiesInvolved((prev) =>
                        v === true ? [...prev, p.value] : prev.filter((x) => x !== p.value),
                      )
                    }
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <PartyCasualtyInputs
              parties={partiesInvolved}
              value={casualtyBreakdown}
              onChange={setCasualtyBreakdown}
            />
          </div>
          <div>
            <Label>Featured image (optional)</Label>
            <div className="mt-2 space-y-2">
              <ImageUploadField
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
              <Input
                value={form.image_alt}
                onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
                placeholder="Alt text"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={form.image_caption}
                  onChange={(e) => setForm({ ...form, image_caption: e.target.value })}
                  placeholder="Caption (optional)"
                />
                <Input
                  value={form.image_credit}
                  onChange={(e) => setForm({ ...form, image_credit: e.target.value })}
                  placeholder="Credit / source (optional)"
                />
              </div>
            </div>
          </div>
          {canReview ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reviewer tools
              </p>
          {([{ mode: "generate", provider: "grok" }, { mode: "autopopulate", provider: "groq" }, { mode: "autopopulate", provider: "grok" }] as const).map(({ mode, provider }) => (
                <EditorialAIButton
              key={`${mode}-${provider}`}
                  contentType="report"
                  mode={mode}
              provider={provider}
                  current={form}
                  source=""
                  onDraft={(draft) =>
                    setForm((current) => ({
                      ...current,
                      ...(typeof draft.title === "string" && draft.title.trim() ? { title: draft.title } : {}),
                      ...(typeof draft.description === "string" && draft.description.trim() ? { description: draft.description } : {}),
                      ...(typeof draft.county === "string" && draft.county.trim() ? { county: draft.county } : {}),
                      ...(typeof draft.road === "string" && draft.road.trim() ? { road: draft.road } : {}),
                      ...(typeof draft.incident_type === "string" && draft.incident_type.trim() ? { incident_type: draft.incident_type } : {}),
                      ...(typeof draft.severity === "string" && draft.severity.trim() ? { severity: draft.severity } : {}),
                      ...(typeof draft.occurred_at === "string" && draft.occurred_at.trim() ? { occurred_at: draft.occurred_at.slice(0, 16) } : {}),
                      ...(typeof draft.vehicles_involved === "number" ? { vehicles_involved: draft.vehicles_involved } : {}),
                      ...(typeof draft.casualties === "number" ? { casualties: draft.casualties } : {}),
                      ...(typeof draft.fatalities === "number" ? { fatalities: draft.fatalities } : {}),
                      ...(Array.isArray(draft.parties_involved) ? { parties_involved: draft.parties_involved } : {}),
                      ...(typeof draft.seo_title === "string" && draft.seo_title.trim() ? { seo_title: draft.seo_title } : {}),
                      ...(typeof draft.seo_description === "string" && draft.seo_description.trim() ? { seo_description: draft.seo_description } : {}),
                      ...(typeof draft.seo_keywords === "string" && draft.seo_keywords.trim() ? { seo_keywords: draft.seo_keywords } : {}),
                      ...(typeof draft.image_alt === "string" && draft.image_alt.trim() ? { image_alt: draft.image_alt } : {}),
                      ...(typeof draft.image_caption === "string" && draft.image_caption.trim() ? { image_caption: draft.image_caption } : {}),
                      ...(typeof draft.image_credit === "string" && draft.image_credit.trim() ? { image_credit: draft.image_credit } : {}),
                    }))
                  }
                />
              ))}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
      <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Reports are reviewed and may be edited for accuracy by a moderator or editor before they
        appear publicly. Published reports credit both of you.
      </p>
      {identity.type === "profile" ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
          Submit anonymously
        </label>
      ) : null}
      {canReview ? (
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Publishing…" : "Publish report"}
        </Button>
      ) : (
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit report for review"}
        </Button>
      )}
    </form>
  );
}
