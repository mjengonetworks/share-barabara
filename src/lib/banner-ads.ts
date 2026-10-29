export type BannerAdCandidate = {
  active?: boolean;
  ends_at?: string | null;
  link_url: string;
  placement?: string | null;
  priority?: number | null;
  starts_at?: string | null;
};

export function selectEligibleBannerAds(ads: BannerAdCandidate[], placement: string, now = Date.now()) {
  return ads
    .filter((ad) => {
      const startsAt = ad.starts_at ? Date.parse(ad.starts_at) : Number.NEGATIVE_INFINITY;
      const endsAt = ad.ends_at ? Date.parse(ad.ends_at) : Number.POSITIVE_INFINITY;
      const inPlacement = !ad.placement || ad.placement === placement || ad.placement === "site-default";
      return ad.active !== false && inPlacement && startsAt <= now && endsAt >= now && /^https?:\/\//i.test(ad.link_url);
    })
    .sort((a, b) => {
      const aExact = a.placement === placement ? 1 : 0;
      const bExact = b.placement === placement ? 1 : 0;
      return bExact - aExact || (b.priority ?? 0) - (a.priority ?? 0);
    });
}
