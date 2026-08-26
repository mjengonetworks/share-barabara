import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { CategoryMultiSelect } from "@/components/site/category-multi-select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useRoles } from "@/hooks/useRoles";
import { useNewsCategories } from "@/hooks/useTaxonomy";
import { slugify } from "@/lib/format";

export function ArticleForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const { identity } = useActiveIdentity();
  const queryClient = useQueryClient();
  const { canPublishArticles } = useRoles();
  const { data: categories = [] } = useNewsCategories();
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    image_url: "",
    image_caption: "",
    image_credit: "",
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
        image_caption: form.image_caption.trim() || null,
        image_credit: form.image_credit.trim() || null,
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
        image_caption: "",
        image_credit: "",
      });
      setSelectedCategories(["News"]);
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
        submit.mutate(canPublishArticles ? "published" : "pending_review");
      }}
    >
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
      <div>
        <Label>Featured image (optional)</Label>
        <div className="mt-2">
          <ImageUploadField
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
          />
        </div>
        {form.image_url ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
        ) : null}
      </div>
      <div>
        <Label htmlFor="a-summary">Summary</Label>
        <Textarea
          id="a-summary"
          required
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
          rows={8}
          value={form.body}
          onChange={(v) => setForm({ ...form, body: v })}
          placeholder="Separate paragraphs with a blank line. Use the toolbar to add bold, italic, links, images or a YouTube video."
        />
      </div>
      {!canPublishArticles ? (
        <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Submitted articles are reviewed and may be edited for accuracy by an editor before they
          appear publicly.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canPublishArticles ? (
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Publishing…" : "Publish now"}
          </Button>
        ) : (
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={submit.isPending}
          onClick={() => submit.mutate("draft")}
        >
          Save as draft
        </Button>
      </div>
    </form>
  );
}
