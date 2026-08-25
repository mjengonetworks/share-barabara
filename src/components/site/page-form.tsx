import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { KENYA_COUNTIES, PAGE_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/format";

type ExistingPage = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  county: string | null;
  website_url: string | null;
  phone: string | null;
};

export function PageForm({ existing, onDone }: { existing?: ExistingPage; onDone?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    category: (existing?.category as (typeof PAGE_CATEGORIES)[number]) ?? "Other",
    description: existing?.description ?? "",
    county: existing?.county ?? "",
    website_url: existing?.website_url ?? "",
    phone: existing?.phone ?? "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || null,
        county: form.county || null,
        website_url: form.website_url || null,
        phone: form.phone || null,
      };
      if (existing) {
        const { error } = await supabase.from("pages").update(payload).eq("id", existing.id);
        if (error) throw error;
        return existing.slug;
      }
      const slug = slugify(form.name);
      const { error } = await supabase
        .from("pages")
        .insert({ ...payload, slug, owner_id: user.id });
      if (error) throw error;
      return slug;
    },
    onSuccess: (slug) => {
      toast.success(existing ? "Page updated" : "Page created");
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["page", slug] });
      onDone?.();
      if (!existing) navigate({ to: "/pages/$slug", params: { slug } });
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
        <Label htmlFor="p-name">Organisation name</Label>
        <Input
          id="p-name"
          required
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Safe Roads Kenya"
        />
      </div>
      <div>
        <Label>Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) =>
            setForm({ ...form, category: v as (typeof PAGE_CATEGORIES)[number] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>County (optional)</Label>
        <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a county" />
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
        <Label htmlFor="p-description">Description</Label>
        <Textarea
          id="p-description"
          rows={4}
          maxLength={1000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What this organisation does and how it relates to road safety."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-website">Website (optional)</Label>
          <Input
            id="p-website"
            type="url"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="p-phone">Phone (optional)</Label>
          <Input
            id="p-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="07..."
          />
        </div>
      </div>
      <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        A verified blue checkmark for Pages is a paid, admin-activated status. See{" "}
        <span className="font-semibold">Subscribe</span> for details.
      </p>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Saving…" : existing ? "Save changes" : "Create page"}
      </Button>
    </form>
  );
}
