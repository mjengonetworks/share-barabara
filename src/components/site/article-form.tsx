import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NEWS_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/format";

export function ArticleForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    category: "News" as (typeof NEWS_CATEGORIES)[number],
  });

  const submit = useMutation({
    mutationFn: async (status: "draft" | "pending_review") => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("news").insert({
        title: form.title,
        summary: form.summary,
        body: form.body,
        category: form.category,
        slug: slugify(form.title),
        author_id: user.id,
        status,
      });
      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      toast.success(
        status === "pending_review"
          ? "Article submitted — an editor will review it before it is published"
          : "Draft saved. Find it on your dashboard when you're ready to submit it.",
      );
      setForm({ title: "", summary: "", body: "", category: "News" });
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate("pending_review");
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
        <Label>Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) =>
            setForm({ ...form, category: v as (typeof NEWS_CATEGORIES)[number] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NEWS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Textarea
          id="a-body"
          required
          rows={8}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Separate paragraphs with a blank line."
        />
      </div>
      <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Submitted articles are reviewed and may be edited for accuracy by an editor before they
        appear publicly.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit for review"}
        </Button>
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
