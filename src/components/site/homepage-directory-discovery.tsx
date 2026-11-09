import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, CircleUserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeaturedProfile } from "@/hooks/useFeatured";

export function HomepageDirectoryDiscovery() {
  const { data: featuredProfile } = useFeaturedProfile("home_profile");
  const { data } = useQuery({
    queryKey: ["homepage-directory-discovery"],
    queryFn: async () => {
      const [pages, profiles] = await Promise.all([
        supabase.from("pages").select("id, slug, name, category, description, logo_url, verified").order("created_at", { ascending: false }).limit(3),
        supabase.from("profiles").select("id, username, display_name, occupation, county, avatar_url, suspended").eq("suspended", false).order("created_at", { ascending: false }).limit(4),
      ]);
      if (pages.error) throw pages.error;
      if (profiles.error) throw profiles.error;
      return { pages: pages.data ?? [], profiles: profiles.data ?? [] };
    },
    staleTime: 60_000,
  });
  const profiles = (data?.profiles ?? []).filter((profile) => profile.id !== featuredProfile?.id).slice(0, 3);
  const pages = data?.pages ?? [];
  if (!featuredProfile && !pages.length && !profiles.length) return null;
  return (
    <section className="public-content-container py-4 sm:py-5" aria-labelledby="homepage-directory-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Community discovery</p><h2 id="homepage-directory-heading" className="mt-1 text-xl font-bold text-brand-navy">Pages and profiles</h2></div>
        <div className="flex gap-3 text-sm font-semibold text-brand-blue underline"><Link to="/pages">View all pages</Link><Link to="/contributors">View all profiles</Link></div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {featuredProfile ? <article className="rounded-lg border border-accent/40 bg-accent/10 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-accent-foreground">Featured profile</p><div className="mt-2 flex items-center gap-3">{featuredProfile.avatar_url ? <img src={featuredProfile.avatar_url} alt="" className="size-10 rounded-full object-cover" /> : <CircleUserRound className="size-10 text-brand-blue" aria-hidden="true" />}<div className="min-w-0"><p className="truncate font-bold text-brand-navy">{featuredProfile.display_name}</p><p className="truncate text-xs text-muted-foreground">{featuredProfile.occupation ?? featuredProfile.county ?? "Share Barabara member"}</p></div></div><Link to="/u/$userId" params={{ userId: featuredProfile.username ?? featuredProfile.id }} className="mt-3 inline-block text-xs font-semibold text-brand-blue underline">View profile</Link></article> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((page) => <Link key={page.id} to="/pages/$slug" params={{ slug: page.slug }} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent">{page.logo_url ? <img src={page.logo_url} alt="" className="size-9 shrink-0 rounded object-cover" /> : <Building2 className="size-8 shrink-0 text-brand-blue" aria-hidden="true" />}<span className="min-w-0"><span className="flex items-center gap-1 truncate text-sm font-semibold text-brand-navy">{page.name}{page.verified ? <BadgeCheck className="size-3.5 shrink-0 text-accent" aria-label="Verified page" /> : null}</span><span className="block truncate text-xs text-muted-foreground">{page.category}</span></span></Link>)}
          {profiles.map((profile) => <Link key={profile.id} to="/u/$userId" params={{ userId: profile.username ?? profile.id }} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="size-9 shrink-0 rounded-full object-cover" /> : <CircleUserRound className="size-8 shrink-0 text-brand-blue" aria-hidden="true" />}<span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-navy">{profile.display_name}</span><span className="block truncate text-xs text-muted-foreground">{profile.occupation ?? profile.county ?? "Share Barabara member"}</span></span></Link>)}
        </div>
      </div>
    </section>
  );
}
