import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { ROLE_RANK, useRoles } from "@/hooks/useRoles";

/** Article writing is a subscriber perk for guest authors, but staff (author rank and
 *  above) can write without subscribing — that's the whole point of the role. Applies
 *  only to a profile identity: a page still needs to be verified either way. */
export function useCanWriteArticles() {
  const { user } = useAuth();
  const { identity, activePage } = useActiveIdentity();
  const { data: subStatus = {} } = useSubscriptionStatuses(user ? [user.id] : []);
  const { rank } = useRoles();

  if (!user) return false;
  if (identity.type === "page") return !!activePage?.verified;
  if (rank >= ROLE_RANK.author) return true;
  return !!subStatus[user.id];
}
