import { Link } from "@tanstack/react-router";

export function UserLink({
  userId,
  name,
  className = "",
}: {
  userId: string | null | undefined;
  name?: string | undefined;
  className?: string;
}) {
  const label = name ?? "Road user";
  if (!userId) return <span className={className}>{label}</span>;
  return (
    <Link
      to="/u/$userId"
      params={{ userId }}
      className={`font-semibold text-foreground underline-offset-2 hover:underline ${className}`}
    >
      {label}
    </Link>
  );
}
