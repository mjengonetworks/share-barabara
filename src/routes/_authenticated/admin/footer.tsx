import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/footer")({
  head: () => ({ meta: [{ title: "Footer & Contact: Share Barabara Admin" }] }),
  component: FooterPage,
});

function FooterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    footer_tagline: "",
    contact_email: "",
    contact_phone: "",
    google_source_label: "",
    google_source_url: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        footer_tagline: settings.footer_tagline,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        google_source_label: settings.google_source_label,
        google_source_url: settings.google_source_url,
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .update({ ...form, updated_by: user?.id ?? null })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Footer updated");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Footer &amp; contact</h1>
      <p className="mt-2 text-muted-foreground">
        Shown at the bottom of every page. Social icons are managed separately.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5 card-elevated">
        <div>
          <Label htmlFor="tagline">Footer tagline</Label>
          <Textarea
            id="tagline"
            rows={3}
            value={form.footer_tagline}
            onChange={(e) => setForm({ ...form, footer_tagline: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="email">Contact email</Label>
          <Input
            id="email"
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="phone">Contact phone</Label>
          <Input
            id="phone"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gsl">"Add as preferred source on Google" link label</Label>
          <Input
            id="gsl"
            value={form.google_source_label}
            onChange={(e) => setForm({ ...form, google_source_label: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gsu">Google preferred-source URL</Label>
          <Input
            id="gsu"
            type="url"
            value={form.google_source_url}
            onChange={(e) => setForm({ ...form, google_source_url: e.target.value })}
          />
        </div>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </div>
  );
}
