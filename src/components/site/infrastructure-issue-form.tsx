import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { KENYA_COUNTIES, ROAD_AUTHORITIES, STRUCTURE_TYPES } from "@/lib/constants";

export function InfrastructureIssueForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { identity } = useActiveIdentity();
  const [anonymous, setAnonymous] = useState(false);
  const [form, setForm] = useState({
    title: "",
    road_name: "",
    road_scope: "county" as "county" | "national",
    county: "Nairobi",
    authority: "County Government",
    structure_type: "road",
    image_url: "",
    summary: "",
    content: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("infrastructure_issues").insert({
        ...form,
        image_url: form.image_url.trim() || null,
        user_id: user.id,
        page_id: identity.type === "page" ? identity.pageId : null,
        is_anonymous: identity.type === "profile" && anonymous,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        "Issue submitted for review, a moderator will verify it before it is published",
      );
      setForm({ ...form, title: "", road_name: "", image_url: "", summary: "", content: "" });
      setAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["infrastructure-issues"] });
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
        <Label htmlFor="i-road">Road name</Label>
        <Input
          id="i-road"
          required
          maxLength={150}
          value={form.road_name}
          onChange={(e) => setForm({ ...form, road_name: e.target.value })}
          placeholder="e.g. Nairobi-Nakuru Highway"
        />
      </div>
      <div>
        <Label htmlFor="i-title">Issue title</Label>
        <Input
          id="i-title"
          required
          maxLength={150}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Collapsed culvert washing out the shoulder near Mai Mahiu"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Road scope</Label>
          <Select
            value={form.road_scope}
            onValueChange={(v) => setForm({ ...form, road_scope: v as "county" | "national" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="county">County road</SelectItem>
              <SelectItem value="national">National road</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <div>
          <Label>Responsible authority</Label>
          <Select value={form.authority} onValueChange={(v) => setForm({ ...form, authority: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROAD_AUTHORITIES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Structure type</Label>
          <Select
            value={form.structure_type}
            onValueChange={(v) => setForm({ ...form, structure_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRUCTURE_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="i-img">Featured image URL (optional)</Label>
        <Input
          id="i-img"
          type="url"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label htmlFor="i-summary">Brief summary</Label>
        <Textarea
          id="i-summary"
          required
          rows={2}
          maxLength={280}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="A one or two sentence summary shown in issue listings."
        />
      </div>
      <div>
        <Label htmlFor="i-content">Details</Label>
        <RichTextEditor
          id="i-content"
          required
          rows={6}
          value={form.content}
          onChange={(v) => setForm({ ...form, content: v })}
          placeholder="What's wrong, how long it's been like this, and how it affects road users. Add photos or a video with the toolbar."
        />
      </div>
      {identity.type === "profile" ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
          Submit anonymously
        </label>
      ) : null}
      <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Submissions are reviewed by a moderator before appearing publicly.
      </p>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : "Submit issue for review"}
      </Button>
    </form>
  );
}
