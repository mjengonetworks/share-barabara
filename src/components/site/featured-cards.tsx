import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, CircleUserRound, Sparkles } from "lucide-react";
import { useFeaturedPage, useFeaturedProfile } from "@/hooks/useFeatured";

export function FeaturedProfileCard({ slot }: { slot: "home_profile" | "campaigns_profile" }) {
  const { data: profile } = useFeaturedProfile(slot);
  if (!profile) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 card-elevated">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        <Sparkles className="size-4" /> Featured profile of the day
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
          <CircleUserRound className="size-6" />
        </span>
        <div>
          <p className="flex items-center gap-1 text-lg font-bold">
            {profile.display_name ?? "Road user"}
            <BadgeCheck className="size-4 text-accent" aria-label="Subscribed member" />
          </p>
          {profile.county ? (
            <p className="text-sm text-muted-foreground">{profile.county}</p>
          ) : null}
        </div>
      </div>
      {profile.road_safety_message ? (
        <p className="mt-4 border-l-4 border-accent pl-4 italic text-muted-foreground">
          "{profile.road_safety_message}"
        </p>
      ) : null}
      <Link
        to="/u/$userId"
        params={{ userId: profile.id }}
        className="mt-4 inline-block text-sm font-semibold text-accent-foreground underline"
      >
        View full profile
      </Link>
    </div>
  );
}

const PAGE_SLOT_LABEL: Record<
  "home_page" | "campaigns_page" | "pages_of_day" | "pages_of_week",
  string
> = {
  home_page: "Featured page",
  campaigns_page: "Featured page",
  pages_of_day: "Featured page of the day",
  pages_of_week: "Featured page of the week",
};

export function FeaturedPageCard({
  slot,
}: {
  slot: "home_page" | "campaigns_page" | "pages_of_day" | "pages_of_week";
}) {
  const { data: page } = useFeaturedPage(slot);
  if (!page) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 card-elevated">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        <Sparkles className="size-4" /> {PAGE_SLOT_LABEL[slot]}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded bg-accent/20 text-accent-foreground">
          <Building2 className="size-6" />
        </span>
        <div>
          <p className="flex items-center gap-1 text-lg font-bold">
            {page.name}
            <BadgeCheck className="size-4 text-accent" aria-label="Verified page" />
          </p>
          <p className="text-sm text-muted-foreground">{page.category}</p>
        </div>
      </div>
      {page.description ? (
        <p className="mt-4 line-clamp-3 text-muted-foreground">{page.description}</p>
      ) : null}
      <Link
        to="/pages/$slug"
        params={{ slug: page.slug }}
        className="mt-4 inline-block text-sm font-semibold text-accent-foreground underline"
      >
        View page
      </Link>
    </div>
  );
}
