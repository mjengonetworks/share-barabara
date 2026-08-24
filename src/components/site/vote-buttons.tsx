import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoteButtons({
  net,
  mine,
  onVote,
  size = "sm",
}: {
  net: number;
  mine: number;
  onVote: (value: 1 | -1) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "size-4" : "size-5";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Upvote"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(1);
        }}
        className={cn("rounded p-1 hover:bg-muted", mine === 1 && "text-safe")}
      >
        <ArrowBigUp className={iconSize} fill={mine === 1 ? "currentColor" : "none"} />
      </button>
      <span className="min-w-4 text-center text-xs font-semibold">{net}</span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(-1);
        }}
        className={cn("rounded p-1 hover:bg-muted", mine === -1 && "text-destructive")}
      >
        <ArrowBigDown className={iconSize} fill={mine === -1 ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
