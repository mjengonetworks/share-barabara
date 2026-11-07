import { CircleUserRound } from "lucide-react";

/** className should include a size-N (or explicit width/height) utility — sizing is
 *  left to the caller since Tailwind can't resolve a dynamically interpolated class. */
export function UserAvatar({
  url,
  name,
  className = "size-10",
  tone = "light",
}: {
  url?: string | null | undefined;
  name?: string | null | undefined;
  className?: string;
  tone?: "light" | "navy";
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "Profile picture"}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${tone === "navy" ? "bg-white/15 text-white" : "bg-[#EAF3FF] text-[#142B56]"} ${className}`}
    >
      <CircleUserRound className="size-2/3" />
    </span>
  );
}
