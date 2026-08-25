import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";

export function UserLink({
  userId,
  name,
  verified = false,
  className = "",
}: {
  userId: string | null | undefined;
  name?: string | undefined;
  verified?: boolean;
  className?: string;
}) {
  const label = name ?? "Road user";
  if (!userId) return <span className={className}>{label}</span>;
  return (
    <Link
      to="/u/$userId"
      params={{ userId }}
      className={`inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline ${className}`}
    >
      {label}
      {verified ? (
        <BadgeCheck className="size-3.5 shrink-0 text-accent" aria-label="Subscribed member" />
      ) : null}
    </Link>
  );
}
