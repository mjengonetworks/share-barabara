import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Gift, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { KENYA_COUNTIES } from "@/lib/constants";
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
import { UserAvatar } from "@/components/site/user-avatar";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Profile Settings: Share Barabara" }],
  }),
  component: SettingsPage,
});

type ProfileForm = {
  display_name: string;
  username: string;
  county: string;
  bio: string;
  occupation: string;
  road_safety_message: string;
  mjengo_networks_url: string;
  mjengo_hub_url: string;
  avatar_url: string;
};

const EMPTY: ProfileForm = {
  display_name: "",
  username: "",
  county: "",
  bio: "",
  occupation: "",
  road_safety_message: "",
  mjengo_networks_url: "",
  mjengo_hub_url: "",
  avatar_url: "",
};

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])?$/;

function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralInput, setReferralInput] = useState("");

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && !loaded) {
      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        county: profile.county ?? "",
        bio: profile.bio ?? "",
        occupation: profile.occupation ?? "",
        road_safety_message: profile.road_safety_message ?? "",
        mjengo_networks_url: profile.mjengo_networks_url ?? "",
        mjengo_hub_url: profile.mjengo_hub_url ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
      setLoaded(true);
    }
  }, [profile, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const username = form.username.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) {
        throw new Error(
          "Username must be 3-24 characters: lowercase letters, numbers and hyphens only.",
        );
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name || "Road user",
          username,
          county: form.county || null,
          bio: form.bio || null,
          occupation: form.occupation || null,
          road_safety_message: form.road_safety_message || null,
          mjengo_networks_url: form.mjengo_networks_url || null,
          mjengo_hub_url: form.mjengo_hub_url || null,
          avatar_url: form.avatar_url.trim() || null,
        })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") throw new Error("That username is already taken.");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileUrl =
    typeof window !== "undefined" && form.username
      ? `${window.location.origin}/u/${form.username}`
      : "";

  async function copyProfileUrl() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  const { data: ownReferral } = useQuery({
    enabled: !!user,
    queryKey: ["referral-own", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id")
        .eq("referee_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const referralUrl =
    typeof window !== "undefined" && profile?.referral_code
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";

  async function copyReferralUrl() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setReferralCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  const applyReferral = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("apply_referral_code", {
        _code: referralInput.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (applied) => {
      if (applied) {
        toast.success("Referral code applied");
        queryClient.invalidateQueries({ queryKey: ["referral-own", user?.id] });
      } else {
        toast.error("That code doesn't look right");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Sign in to edit your profile</h1>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const set = (patch: Partial<ProfileForm>) => setForm({ ...form, ...patch });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Your account
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-4xl font-extrabold">
        <UserCog className="size-8 text-accent" /> Profile settings
      </h1>

      <form
        className="mt-8 space-y-5 rounded-lg border border-border bg-card p-6 card-elevated"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <Label htmlFor="s-avatar">Profile picture URL</Label>
          <div className="mt-2 flex items-center gap-3">
            <UserAvatar url={form.avatar_url} name={form.display_name} className="size-14" />
            <Input
              id="s-avatar"
              type="url"
              value={form.avatar_url}
              onChange={(e) => set({ avatar_url: e.target.value })}
              placeholder="https://…"
              className="flex-1"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Defaults to your Google account picture on signup; paste a different image URL to change
            it.
          </p>
        </div>
        <div>
          <Label htmlFor="s-name">Display name</Label>
          <Input
            id="s-name"
            value={form.display_name}
            onChange={(e) => set({ display_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="s-username">Username</Label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">sharebarabara.co.ke/u/</span>
            <Input
              id="s-username"
              value={form.username}
              onChange={(e) =>
                set({ username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
              maxLength={24}
              className="max-w-[14rem]"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            3-24 characters: lowercase letters, numbers and hyphens. Used for your public profile
            link.
          </p>
          {profileUrl ? (
            <div className="mt-2 flex items-center gap-2">
              <a href={profileUrl} className="text-sm text-brand-blue underline">
                {profileUrl.replace(/^https?:\/\//, "")}
              </a>
              <button
                type="button"
                onClick={copyProfileUrl}
                aria-label="Copy profile link"
                className="text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="size-4 text-safe" /> : <Copy className="size-4" />}
              </button>
            </div>
          ) : null}
        </div>
        <div>
          <Label>County</Label>
          <Select value={form.county} onValueChange={(v) => set({ county: v })}>
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
          <Label htmlFor="s-occupation">Occupation (optional)</Label>
          <Input
            id="s-occupation"
            value={form.occupation}
            onChange={(e) => set({ occupation: e.target.value })}
            placeholder="e.g. Driving instructor, matatu operator"
          />
        </div>
        <div>
          <Label htmlFor="s-bio">Bio</Label>
          <Textarea
            id="s-bio"
            rows={3}
            value={form.bio}
            onChange={(e) => set({ bio: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="s-message">Your personal road safety message</Label>
          <Textarea
            id="s-message"
            rows={2}
            value={form.road_safety_message}
            onChange={(e) => set({ road_safety_message: e.target.value })}
            placeholder="A short message shown on your public profile."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-mn">Mjengo Networks profile (optional)</Label>
            <Input
              id="s-mn"
              type="url"
              value={form.mjengo_networks_url}
              onChange={(e) => set({ mjengo_networks_url: e.target.value })}
              placeholder="https://mjengonetworks.co.ke/..."
            />
          </div>
          <div>
            <Label htmlFor="s-mh">Mjengo Hub profile (optional)</Label>
            <Input
              id="s-mh"
              type="url"
              value={form.mjengo_hub_url}
              onChange={(e) => set({ mjengo_hub_url: e.target.value })}
              placeholder="https://mjengohub.co.ke/..."
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Other social media links are only shown on your full Mjengo Networks profile, not here.
        </p>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="mt-8 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Gift className="size-5 text-accent" /> Referrals
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Earn {profile?.referral_points ?? 0} points so far. You get 5 points when someone signs up
          with your link, and 15 more once they subscribe to Premium.
        </p>
        {referralUrl ? (
          <div className="mt-3 flex items-center gap-2">
            <a href={referralUrl} className="text-sm text-brand-blue underline">
              {referralUrl.replace(/^https?:\/\//, "")}
            </a>
            <button
              type="button"
              onClick={copyReferralUrl}
              aria-label="Copy referral link"
              className="text-muted-foreground hover:text-foreground"
            >
              {referralCopied ? (
                <Check className="size-4 text-safe" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        ) : null}

        {!ownReferral ? (
          <div className="mt-5 border-t border-border pt-4">
            <Label htmlFor="s-referral">Have a referral code?</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="s-referral"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD3"
                className="max-w-40"
              />
              <Button
                type="button"
                variant="outline"
                disabled={referralInput.trim().length < 4 || applyReferral.isPending}
                onClick={() => applyReferral.mutate()}
              >
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
