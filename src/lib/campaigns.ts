export type CampaignStatus = "upcoming" | "ongoing" | "previous";

/** Derived from the dates alone so it can never drift out of sync with the
 *  calendar — a campaign moves from upcoming to ongoing to previous purely
 *  by time passing, with nothing to keep in sync manually. */
export function campaignStatus(
  startDate: string,
  endDate: string,
  now = new Date(),
): CampaignStatus {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (today < startDate) return "upcoming";
  if (today > endDate) return "previous";
  return "ongoing";
}
