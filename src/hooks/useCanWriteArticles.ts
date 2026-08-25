import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";

/** Article writing is a subscriber perk: a subscribed profile, or a verified (premium) page. */
export function useCanWriteArticles() {
  const { user } = useAuth();
  const { identity, activePage } = useActiveIdentity();
  const { data: subStatus = {} } = useSubscriptionStatuses(user ? [user.id] : []);

  if (!user) return false;
  if (identity.type === "page") return !!activePage?.verified;
  return !!subStatus[user.id];
}
