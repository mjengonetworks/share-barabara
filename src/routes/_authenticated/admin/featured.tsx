import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/lib/profiles";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/featured")({
  head: () => ({ meta: [{ title: "Featured Picks: Share Barabara Admin" }] }),
  component: FeaturedPicksPage,
});

const FEATURED_SLOTS = [
  { slot: "home_profile", label: "Home: featured profile", kind: "profile" as const },
  { slot: "home_page", label: "Home: featured page", kind: "page" as const },
  {
    slot: "campaigns_profile_of_day",
    label: "Campaigns: featured profile of the day",
    kind: "profile" as const,
  },
  {
    slot: "campaigns_page_of_day",
    label: "Campaigns: featured page of the day",
    kind: "page" as const,
  },
  {
    slot: "campaigns_profile_of_week",
    label: "Campaigns: featured profile of the week",
    kind: "profile" as const,
  },
  {
    slot: "campaigns_page_of_week",
    label: "Campaigns: featured page of the week",
    kind: "page" as const,
  },
  {
    slot: "pages_of_day",
    label: "Pages directory: featured page of the day",
    kind: "page" as const,
  },
  {
    slot: "pages_of_week",
    label: "Pages directory: featured page of the week",
    kind: "page" as const,
  },
  { slot: "home_pages_1", label: "Home: Pages preview, slot 1", kind: "page" as const },
  { slot: "home_pages_2", label: "Home: Pages preview, slot 2", kind: "page" as const },
  { slot: "home_pages_3", label: "Home: Pages preview, slot 3", kind: "page" as const },
  { slot: "home_pages_4", label: "Home: Pages preview, slot 4", kind: "page" as const },
  { slot: "home_pages_5", label: "Home: Pages preview, slot 5", kind: "page" as const },
];

function FeaturedPicksPage() {
  const queryClient = useQueryClient();

  const { data: picks = [], isLoading } = useQuery({
    queryKey: ["featured-picks-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("featured_picks").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["subscribers-brief"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("active", true);
      if (error) throw error;
      return data.map((s) => s.user_id);
    },
  });
  const { data: subscriberNames = {} } = useProfileNames(subscribers);

  const { data: pages = [] } = useQuery({
    queryKey: ["pages-brief"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const set = useMutation({
    mutationFn: async ({
      slot,
      userId,
      pageId,
    }: {
      slot: string;
      userId: string | null;
      pageId: string | null;
    }) => {
      const { error } = await supabase
        .from("featured_picks")
        .update({ user_id: userId, page_id: pageId })
        .eq("slot", slot);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Featured pick updated");
      queryClient.invalidateQueries({ queryKey: ["featured-picks-admin"] });
      queryClient.invalidateQueries({ queryKey: ["featured-profile"] });
      queryClient.invalidateQueries({ queryKey: ["featured-page"] });
      queryClient.invalidateQueries({ queryKey: ["featured-pages-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Featured picks</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Pin a specific contributor or page to a slot. Leave it unset and the site picks randomly
        (but stably for the day) from subscribed members and verified pages.
      </p>

      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {FEATURED_SLOTS.map(({ slot, label, kind }) => {
            const pick = picks.find((p) => p.slot === slot);
            const value =
              kind === "profile" ? (pick?.user_id ?? "random") : (pick?.page_id ?? "random");
            return (
              <div key={slot} className="rounded-lg border border-border bg-card p-4">
                <Label>{label}</Label>
                <Select
                  value={value}
                  onValueChange={(v) =>
                    set.mutate(
                      kind === "profile"
                        ? { slot, userId: v === "random" ? null : v, pageId: null }
                        : { slot, userId: null, pageId: v === "random" ? null : v },
                    )
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random (default)</SelectItem>
                    {kind === "profile"
                      ? subscribers.map((id) => (
                          <SelectItem key={id} value={id}>
                            {subscriberNames[id] ?? id}
                          </SelectItem>
                        ))
                      : pages.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
