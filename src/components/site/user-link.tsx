import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";

export function UserLink({
  userId,
  name,
  username,
  verified = false,
  staff = false,
  anonymous = false,
  pageSlug,
  pageName,
  className = "",
}: {
  userId: string | null | undefined;
  name?: string | undefined;
  /** Preferred link target: the user's username, falling back to their id if unset. */
  username?: string | null | undefined;
  verified?: boolean;
  /** Moderator rank and above: a gold checkmark instead of the dark-blue subscriber
   *  one, so staff don't need "Admin"/"Editor" spelled out separately next to their name. */
  staff?: boolean;
  /** Row was posted anonymously: hides the real identity even if one is known. */
  anonymous?: boolean;
  /** When set, renders a link to this Page instead of the user's profile. */
  pageSlug?: string | null | undefined;
  pageName?: string | null | undefined;
  className?: string;
}) {
  if (anonymous) {
    return <span className={className}>Anonymous road user</span>;
  }

  if (pageSlug) {
    return (
      <Link
        to="/pages/$slug"
        params={{ slug: pageSlug }}
        className={`inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline ${className}`}
      >
        {pageName ?? "Page"}
        {verified ? (
          <BadgeCheck className="size-3.5 shrink-0 text-brand-blue" aria-label="Verified page" />
        ) : null}
      </Link>
    );
  }

  const badge = staff ? (
    <BadgeCheck className="size-3.5 shrink-0 text-accent" aria-label="Staff member" />
  ) : verified ? (
    <BadgeCheck className="size-3.5 shrink-0 text-brand-blue" aria-label="Subscribed member" />
  ) : null;

  const label = name ?? "Road user";
  if (!userId) return <span className={className}>{label}</span>;
  return (
    <Link
      to="/u/$userId"
      params={{ userId: username ?? userId }}
      className={`inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline ${className}`}
    >
      {label}
      {badge}
    </Link>
  );
}
