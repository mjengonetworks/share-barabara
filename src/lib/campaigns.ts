export type CampaignStatus = "upcoming" | "ongoing" | "previous";

/** Derived from the dates alone so it can never drift out of sync with the
 *  calendar — a campaign moves from upcoming to ongoing to previous purely
 *  by time passing, with nothing to keep in sync manually. */
export function campaignStatus(
  startDate: string,
  endDate: string,
  now = new Date(),
): CampaignStatus {
  const today = now.toISOString().slice(0, 10);
  if (today < startDate) return "upcoming";
  if (today > endDate) return "previous";
  return "ongoing";
}
