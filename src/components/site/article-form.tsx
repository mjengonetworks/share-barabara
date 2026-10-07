import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { CategoryMultiSelect } from "@/components/site/category-multi-select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useRoles } from "@/hooks/useRoles";
import { useNewsCategories } from "@/hooks/useTaxonomy";
import { slugify } from "@/lib/format";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { RoadInput } from "@/components/site/road-input";
import { LocationButton } from "@/components/site/location-button";
import { useArticleLocationSchema } from "@/hooks/useArticleLocation";
import { KENYA_COUNTIES } from "@/lib/constants";

export function ArticleForm({ onDone, editorial = false }: { onDone?: () => void; editorial?: boolean }) {
  const { user } = useAuth();
  const { identity } = useActiveIdentity();
  const queryClient = useQueryClient();
  const { canPublishArticles, canEditSeo } = useRoles();
  const editorialAccess = editorial && canPublishArticles;
  const editorialFields = editorial && canEditSeo;
  const { data: categories = [] } = useNewsCategories();
  const { data: articleLocationAvailable = false } = useArticleLocationSchema();
  const [location, setLocation] = useState({
    label: "",
    type: "named_place",
    county: "",
    road: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    image_url: "",
    image_alt: "",
    image_caption: "",
    image_credit: "",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["News"]);

  const submit = useMutation({
    mutationFn: async (status: "draft" | "pending_review" | "published") => {
      if (!user) throw new Error("Sign in required");
      if (selectedCategories.length === 0) throw new Error("Pick at least one category");
      const { error } = await supabase.from("news").insert({
        title: form.title,
        summary: form.summary,
        body: form.body,
        image_url: form.image_url.trim() || null,
        image_alt: form.image_alt.trim() || null,
        image_caption: form.image_caption.trim() || null,
        image_credit: form.image_credit.trim() || null,
        ...(editorialFields
          ? {
              seo_title: form.seo_title.trim() || null,
              seo_description: form.seo_description.trim() || null,
              seo_keywords: form.seo_keywords.trim() || null,
            }
          : {}),
        ...(articleLocationAvailable
          ? {
              location_label: location.label.trim() || null,
              location_type: location.type || null,
              county: location.county || null,
              road: location.road.trim() || null,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : {}),
        category: selectedCategories[0] ?? "News",
        categories: selectedCategories,
        slug: slugify(form.title),
        author_id: user.id,
        page_id: identity.type === "page" ? identity.pageId : null,
        status,
        ...(status === "published"
          ? {
              published_at: new Date().toISOString(),
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
            }
          : {}),
      });
      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      toast.success(
        status === "published"
          ? "Article published"
          : status === "pending_review"
            ? "Article submitted, an editor will review it before it is published"
            : "Draft saved. Find it on your dashboard when you're ready to submit it.",
      );
      setForm({
        title: "",
        summary: "",
        body: "",
        image_url: "",
        image_alt: "",
        image_caption: "",
        image_credit: "",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
      });
      setSelectedCategories(["News"]);
      setLocation({ label: "", type: "named_place", county: "", road: "", latitude: null, longitude: null });
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate(editorialAccess ? "published" : "pending_review");
      }}
    >
      {editorialAccess ? (
        <div className="space-y-4">
          <EditorialAIButton
            contentType="article"
            mode="generate"
            source={`${form["title"]}\n${form["summary"]}\n${form["body"]}`}
            onDraft={(draft) => {
              setForm((current) => ({
                ...current,
                ...(typeof draft["title"] === "string" ? { title: draft["title"] } : {}),
                ...(typeof draft["summary"] === "string" ? { summary: draft["summary"] } : {}),
                ...(typeof draft["body"] === "string" ? { body: draft["body"] } : {}),
                ...(typeof draft["seo_title"] === "string" ? { seo_title: draft["seo_title"] } : {}),
                ...(typeof draft["seo_description"] === "string" ? { seo_description: draft["seo_description"] } : {}),
                ...(typeof draft["seo_keywords"] === "string" ? { seo_keywords: draft["seo_keywords"] } : {}),
              }));
              if (typeof draft["category"] === "string" && draft["category"].trim()) {
                setSelectedCategories([draft["category"]]);
              }
            }}
          />
          <EditorialAIButton
            contentType="article"
            mode="autopopulate"
            source={`${form["title"]}\n${form["summary"]}\n${form["body"]}`}
            onDraft={(draft) => {
              setForm((current) => ({
                ...current,
                ...(typeof draft["title"] === "string" ? { title: draft["title"] } : {}),
                ...(typeof draft["summary"] === "string" ? { summary: draft["summary"] } : {}),
                ...(typeof draft["body"] === "string" ? { body: draft["body"] } : {}),
                ...(typeof draft["seo_title"] === "string" ? { seo_title: draft["seo_title"] } : {}),
                ...(typeof draft["seo_description"] === "string" ? { seo_description: draft["seo_description"] } : {}),
                ...(typeof draft["seo_keywords"] === "string" ? { seo_keywords: draft["seo_keywords"] } : {}),
              }));
              if (typeof draft["category"] === "string" && draft["category"].trim()) {
                setSelectedCategories([draft["category"]]);
              }
            }}
          />
          <EditorialAIButton
            contentType="article"
            mode="update"
            source={`${form["title"]}\n${form["summary"]}\n${form["body"]}`}
            current={form}
            onDraft={(draft) => setForm((current) => ({
              ...current,
              ...Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== null)),
            }))}
          />
        </div>
      ) : null}
      {articleLocationAvailable ? (
        <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location (optional)</p>
            <p className="mt-1 text-xs text-muted-foreground">Add only a place supported by your source. A point is never required for an Article.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="article-location-label">Place or feature</Label><Input id="article-location-label" value={location.label} onChange={(event) => setLocation({ ...location, label: event.target.value })} placeholder="e.g. Salgaa junction" /></div>
            <div><Label>Location type</Label><Select value={location.type} onValueChange={(value) => setLocation({ ...location, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["county", "County"], ["named_place", "Named place"], ["road", "Road"], ["point", "Point"], ["feature", "Geographic feature"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>County (optional)</Label><Select value={location.county || "none"} onValueChange={(value) => setLocation({ ...location, county: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Select a county" /></SelectTrigger><SelectContent className="max-h-64"><SelectItem value="none">No county</SelectItem>{KENYA_COUNTIES.map((county) => <SelectItem key={county} value={county}>{county}</SelectItem>)}</SelectContent></Select></div>
            <RoadInput value={location.road} onChange={(road) => setLocation({ ...location, road })} id="article-location-road" label="Road (optional)" />
          </div>
          <LocationButton idPrefix="article-location" latitude={location.latitude} longitude={location.longitude} onLocate={(latitude, longitude) => setLocation({ ...location, latitude, longitude })} />
        </div>
      ) : null}
      <div>
        <Label htmlFor="a-title">Headline</Label>
        <Input
          id="a-title"
          required
          maxLength={150}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. New speed bumps installed on the Nairobi-Nakuru highway"
        />
      </div>
      {editorialAccess ? (
        <div>
          <Label>Categories (pick one or more)</Label>
          <div className="mt-2">
            <CategoryMultiSelect
              categories={categories}
              value={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
        </div>
      ) : null}
      <div>
        <Label htmlFor="a-summary">Summary</Label>
          <Textarea
            id="a-summary"
            rows={2}
          maxLength={280}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="A one or two sentence summary shown in article listings."
        />
      </div>
      <div>
        <Label htmlFor="a-body">Article body</Label>
        <RichTextEditor
          id="a-body"
          required
          rows={16}
          value={form.body}
          onChange={(v) => setForm({ ...form, body: v })}
          placeholder="Separate paragraphs with a blank line. Use the toolbar to add bold, italic, links, images or a YouTube video."
        />
      </div>
      {editorialFields ? (
        <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            SEO (optional, overrides defaults)
          </p>
          <div>
            <Label htmlFor="a-seo-title">SEO title</Label>
            <Input
              id="a-seo-title"
              value={form.seo_title}
              onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
              placeholder={form.title || "Defaults to the headline"}
            />
          </div>
          <div>
            <Label htmlFor="a-seo-desc">SEO description</Label>
            <Textarea
              id="a-seo-desc"
              rows={2}
              value={form.seo_description}
              onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
              placeholder={form.summary || "Defaults to the summary"}
            />
          </div>
          <div>
            <Label htmlFor="a-seo-keywords">SEO keywords</Label>
            <Input
              id="a-seo-keywords"
              value={form.seo_keywords}
              onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
              placeholder="comma, separated, keywords"
            />
          </div>
        </div>
      ) : null}
      <div>
        <Label>Featured image (optional)</Label>
        <div className="mt-2 space-y-2">
          <ImageUploadField value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          <Input value={form.image_alt} onChange={(e) => setForm({ ...form, image_alt: e.target.value })} placeholder="Alt text (describes the image for screen readers and search engines)" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={form.image_caption} onChange={(e) => setForm({ ...form, image_caption: e.target.value })} placeholder="Caption (optional)" />
            <Input value={form.image_credit} onChange={(e) => setForm({ ...form, image_credit: e.target.value })} placeholder="Credit / source (optional)" />
          </div>
        </div>
      </div>
      {!editorialAccess ? (
        <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {editorialFields
            ? "Submitted articles are reviewed and may be edited for accuracy by an editor before they appear publicly."
            : "Guest author submissions go straight to review. An editor adds SEO details and image alt text before it's published."}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {editorialAccess ? (
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Publishing…" : "Publish now"}
          </Button>
        ) : (
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        )}
        {editorialFields ? (
          <Button
            type="button"
            variant="outline"
            disabled={submit.isPending}
            onClick={() => submit.mutate("draft")}
          >
            Save as draft
          </Button>
        ) : null}
      </div>
    </form>
  );
}
