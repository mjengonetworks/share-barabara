/**
 * Product catalogue. Keep this as the only application-layer price source.
 * Prices are annual and are deliberately keyed by both the thing being
 * subscribed to and the paid tier. Reputation and verification are separate
 * concepts and must never be derived from this catalogue.
 */
export const SUBSCRIPTION_PRODUCTS = [
  { subject: "profile", tier: "blue", label: "Profile Blue", amountKes: 100 },
  { subject: "profile", tier: "gold", label: "Profile Gold", amountKes: 500 },
  { subject: "page", tier: "blue", label: "Page Blue", amountKes: 500 },
  { subject: "page", tier: "gold", label: "Page Gold", amountKes: 2000 },
] as const;

export type SubscriptionSubject = (typeof SUBSCRIPTION_PRODUCTS)[number]["subject"];
export type SubscriptionTier = (typeof SUBSCRIPTION_PRODUCTS)[number]["tier"];

export const SUBSCRIPTION_BILLING_PERIOD = "annual" as const;

export type SubscriptionStatus = "free" | "pending" | "active" | "expired" | "cancelled" | "failed";

/** Current persisted shape. The existing table has no status column, so this
 * helper intentionally does not pretend that pending/failed are persisted. */
export type ExistingSubscriptionRow = {
  active: boolean;
  expires_at: string | null;
  tier: string;
  user_id: string;
};

export function getSubscriptionProduct(subject: SubscriptionSubject, tier: SubscriptionTier) {
  return SUBSCRIPTION_PRODUCTS.find((product) => product.subject === subject && product.tier === tier);
}

/** Invalid or legacy tier values never become a paid Blue/Gold entitlement. */
export function isSubscriptionTier(value: string): value is SubscriptionTier {
  return value === "blue" || value === "gold";
}

export function isSubscriptionSubject(value: string): value is SubscriptionSubject {
  return value === "profile" || value === "page";
}

export function subscriptionStatus(
  row: Pick<ExistingSubscriptionRow, "active" | "expires_at"> | null | undefined,
  now = new Date(),
): SubscriptionStatus {
  if (!row) return "free";
  if (!row.active) return "cancelled";
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}

export function hasActiveSubscription(
  row: Pick<ExistingSubscriptionRow, "active" | "expires_at"> | null | undefined,
  now = new Date(),
) {
  return subscriptionStatus(row, now) === "active";
}

/** A Page subscription may only be managed by its owner or an admin. */
export function canManagePageSubscription(
  actorId: string | null | undefined,
  pageOwnerId: string | null | undefined,
  isAdmin = false,
) {
  return Boolean(actorId && pageOwnerId && (isAdmin || actorId === pageOwnerId));
}
