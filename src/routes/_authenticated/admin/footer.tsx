import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_RANK, useRoles } from "@/hooks/useRoles";

export const Route = createFileRoute("/_authenticated/admin/footer")({
  head: () => ({ meta: [{ title: "Site Settings: Share Barabara Admin" }] }),
  component: FooterPage,
});

function FooterPage() {
  const { user } = useAuth();
  const { rank } = useRoles();
  const isAdmin = rank >= ROLE_RANK.admin;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    footer_tagline: "",
    contact_email: "",
    contact_phone: "",
    google_source_label: "",
    google_source_url: "",
  });

  const { data: ecosystemPreviews = [], error: ecosystemError } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-ecosystem-previews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecosystem_previews")
        .select("slug, display_name, description, destination_url, icon_url, sort_order, enabled")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: advertisingSettings, error: advertisingError } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-advertising-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertising_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [ecosystemForm, setEcosystemForm] = useState<EcosystemForm[]>(DEFAULT_ECOSYSTEM_FORM);
  const [adForm, setAdForm] = useState(DEFAULT_AD_FORM);

  const updateEcosystem = (index: number, key: keyof EcosystemForm, value: string | number) => {
    setEcosystemForm((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  };

  useEffect(() => {
    if (ecosystemPreviews.length) setEcosystemForm(ecosystemPreviews.map((item) => ({ ...item })));
  }, [ecosystemPreviews]);

  useEffect(() => {
    if (advertisingSettings) setAdForm({ ...advertisingSettings });
  }, [advertisingSettings]);

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

  const saveEcosystem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ecosystem_previews").upsert(
        ecosystemForm.map((item) => ({ ...item, updated_by: user?.id ?? null })),
        { onConflict: "slug" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ecosystem previews updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-previews"] });
      queryClient.invalidateQueries({ queryKey: ["ecosystem-previews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAdvertising = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("advertising_settings")
        .update({ ...adForm, updated_by: user?.id ?? null })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Advertising fallback updated");
      queryClient.invalidateQueries({ queryKey: ["admin-advertising-settings"] });
      queryClient.invalidateQueries({ queryKey: ["advertising-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Site settings</h1>
      <p className="mt-2 text-muted-foreground">
        Manage public footer, ecosystem previews and empty-slot advertising defaults.
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

      {isAdmin ? (
        <>
          <section className="mt-8 rounded-lg border border-border bg-card p-5 card-elevated">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Ecosystem previews</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit the public Mjengo Hub and Mjengo Networks cards. Changes are read from the
                  database without a rebuild.
                </p>
              </div>
              <Building2 className="size-5 shrink-0 text-accent" aria-hidden="true" />
            </div>
            {ecosystemError ? (
              <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Ecosystem settings are not available until the reviewed database migration is
                applied.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {ecosystemForm.map((item, index) => (
                  <div key={item.slug} className="space-y-3 rounded-md border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{item.display_name}</h3>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(enabled) =>
                          setEcosystemForm((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, enabled } : entry,
                            ),
                          )
                        }
                        aria-label={`Enable ${item.display_name}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`eco-name-${item.slug}`}>Display name</Label>
                      <Input
                        id={`eco-name-${item.slug}`}
                        value={item.display_name}
                        onChange={(event) =>
                          updateEcosystem(index, "display_name", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`eco-description-${item.slug}`}>Full description</Label>
                      <Textarea
                        id={`eco-description-${item.slug}`}
                        rows={3}
                        value={item.description}
                        onChange={(event) =>
                          updateEcosystem(index, "description", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`eco-url-${item.slug}`}>Destination URL</Label>
                      <Input
                        id={`eco-url-${item.slug}`}
                        type="url"
                        value={item.destination_url}
                        onChange={(event) =>
                          updateEcosystem(index, "destination_url", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`eco-icon-${item.slug}`}>Optional icon/image URL</Label>
                      <Input
                        id={`eco-icon-${item.slug}`}
                        type="url"
                        value={item.icon_url ?? ""}
                        onChange={(event) => updateEcosystem(index, "icon_url", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`eco-order-${item.slug}`}>Display order</Label>
                      <Input
                        id={`eco-order-${item.slug}`}
                        type="number"
                        min={0}
                        value={item.sort_order}
                        onChange={(event) =>
                          updateEcosystem(index, "sort_order", Number(event.target.value))
                        }
                      />
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy p-3 text-white">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Building2 className="size-4 text-accent" /> {item.display_name}
                        <ExternalLink className="ml-auto size-4" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-blue-100/85">{item.description}</p>
                      <p className="mt-2 text-xs font-semibold text-accent">Preview card</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button disabled={saveEcosystem.isPending} onClick={() => saveEcosystem.mutate()}>
                    {saveEcosystem.isPending ? "Saving…" : "Save ecosystem previews"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEcosystemForm(ecosystemPreviews.map((item) => ({ ...item })))}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="mt-8 rounded-lg border border-border bg-card p-5 card-elevated">
            <h2 className="text-lg font-bold">Advertising fallback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Genuine eligible paid campaigns always take priority. These settings only control
              empty ad slots.
            </p>
            {advertisingError ? (
              <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Advertising settings are not available until the reviewed database migration is
                applied.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="fallback-headline">Fallback headline</Label>
                  <Input
                    id="fallback-headline"
                    value={adForm.fallback_headline}
                    onChange={(event) =>
                      setAdForm({ ...adForm, fallback_headline: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="fallback-copy">Optional supporting text</Label>
                  <Textarea
                    id="fallback-copy"
                    rows={2}
                    value={adForm.fallback_supporting_text}
                    onChange={(event) =>
                      setAdForm({ ...adForm, fallback_supporting_text: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="fallback-destination">Fallback destination URL</Label>
                  <Input
                    id="fallback-destination"
                    value={adForm.fallback_destination_url}
                    onChange={(event) =>
                      setAdForm({ ...adForm, fallback_destination_url: event.target.value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="fallback-enabled">Show fallback in eligible empty slots</Label>
                  <Switch
                    id="fallback-enabled"
                    checked={adForm.fallback_enabled}
                    onCheckedChange={(fallback_enabled) =>
                      setAdForm({ ...adForm, fallback_enabled })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={saveAdvertising.isPending}
                    onClick={() => saveAdvertising.mutate()}
                  >
                    {saveAdvertising.isPending ? "Saving…" : "Save advertising fallback"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => advertisingSettings && setAdForm({ ...advertisingSettings })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

type EcosystemForm = {
  slug: string;
  display_name: string;
  description: string;
  destination_url: string;
  icon_url: string | null;
  sort_order: number;
  enabled: boolean;
};

const DEFAULT_ECOSYSTEM_FORM: EcosystemForm[] = [
  {
    slug: "mjengo-hub",
    display_name: "Mjengo Hub",
    description:
      "Construction news, industry insights, project tracking and documentation from Kenya and beyond.",
    destination_url: "https://mjengohub.co.ke/",
    icon_url: null,
    sort_order: 1,
    enabled: true,
  },
  {
    slug: "mjengo-networks",
    display_name: "Mjengo Networks",
    description:
      "Find rated fundis, contractors, consultants and other professionals and service providers, with pricing, material price indices and automated quote generation from registered suppliers.",
    destination_url: "https://mjengonetworks.co.ke/",
    icon_url: null,
    sort_order: 2,
    enabled: true,
  },
];

const DEFAULT_AD_FORM = {
  id: 1,
  fallback_headline: "Your Ad Here",
  fallback_supporting_text: "",
  fallback_destination_url: "/partner-with-us",
  fallback_style: "navy-gold",
  fallback_enabled: true,
};
