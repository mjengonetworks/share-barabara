import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/site/rich-text-editor";
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
import { matchOrCreateRoad } from "@/lib/roads";
import { RoadInput } from "@/components/site/road-input";
import { LocationButton } from "@/components/site/location-button";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { useRoles } from "@/hooks/useRoles";
import { submitAccidentReport } from "@/lib/report.functions";

export function ReportForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { identity } = useActiveIdentity();
  const { canReview } = useRoles();
  const { data: severities = [] } = useReportSeverities();
  const [anonymous, setAnonymous] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    county: "Nairobi",
    road: "",
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
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const breakdownError = casualtyBreakdownError(casualtyBreakdown, {
        dead: form.fatalities,
        injured: form.casualties,
      });
      if (breakdownError) throw new Error(breakdownError);
      const road_id = await matchOrCreateRoad(form.road, form.county);
      return submitAccidentReport({ data: {
        ...form,
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
      } });
    },
    onSuccess: (result) => {
      toast.success(result.status === "approved" ? "Report published" : "Report submitted for review, an editor will verify it before it is published");
      setForm({
        ...form,
        title: "",
        description: "",
        road: "",
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
      {canReview ? (
        <EditorialAIButton
          contentType="report"
          source={`${form["title"]}\n${form["description"]}\nCounty: ${form["county"]}\nRoad: ${form["road"]}`}
          onDraft={(draft) =>
            setForm((current) => ({
              ...current,
              ...(typeof draft["title"] === "string" ? { title: draft["title"] } : {}),
              ...(typeof draft["description"] === "string" ? { description: draft["description"] } : {}),
              ...(typeof draft["county"] === "string" ? { county: draft["county"] } : {}),
              ...(typeof draft["road"] === "string" ? { road: draft["road"] } : {}),
              ...(typeof draft["severity"] === "string" ? { severity: draft["severity"] } : {}),
              ...(typeof draft["occurred_at"] === "string" ? { occurred_at: draft["occurred_at"] } : {}),
              ...(typeof draft["vehicles_involved"] === "number" || draft["vehicles_involved"] === null
                ? { vehicles_involved: draft["vehicles_involved"] }
                : {}),
              ...(typeof draft["casualties"] === "number" || draft["casualties"] === null ? { casualties: draft["casualties"] } : {}),
              ...(typeof draft["fatalities"] === "number" || draft["fatalities"] === null ? { fatalities: draft["fatalities"] } : {}),
            }))
          }
        />
      ) : null}
      <div>
        <Label htmlFor="r-title">Summary</Label>
        <Input
          id="r-title"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Head-on collision between matatu and pickup"
        />
      </div>
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
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
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
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <NullableNumberField id="r-veh" label="Vehicles involved" value={form.vehicles_involved} onChange={(value) => setForm({ ...form, vehicles_involved: value })} />
        <NullableNumberField id="r-cas" label="Injured" value={form.casualties} onChange={(value) => setForm({ ...form, casualties: value })} />
        <NullableNumberField id="r-fat" label="Fatalities" value={form.fatalities} onChange={(value) => setForm({ ...form, fatalities: value })} />
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
            placeholder="Alt text (describes the image for screen readers and search engines)"
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
      <div>
        <Label htmlFor="r-desc">What happened?</Label>
        <RichTextEditor
          id="r-desc"
          required
          rows={10}
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          placeholder="Weather, road conditions, contributing factors and the response by emergency services. Use the toolbar to add photos or a video."
        />
      </div>
      <div>
        <Label>More images or videos (optional)</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown as a gallery at the end of the report, separate from the featured image and any
          images inside the write-up above.
        </p>
        <div className="mt-2">
          <AttachmentsField value={attachments} onChange={setAttachments} />
        </div>
      </div>
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
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : "Submit report for review"}
      </Button>
    </form>
  );
}
