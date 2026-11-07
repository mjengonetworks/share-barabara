import { ArrowUpRight, MessageCircle, Radio } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/site/user-avatar";
import { timeAgo } from "@/lib/format";
import type { UnifiedFeedItem } from "@/lib/unified-feed";

type Identity = {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
};

export type FeedSurfaceTone = "white" | "blue" | "navy";

export const feedSurfaceTokens: Record<
  FeedSurfaceTone,
  { text: string; secondary: string; link: string; icon: string; border: string; fallback: string }
> = {
  white: {
    text: "text-[#142B56]",
    secondary: "text-[#52647D]",
    link: "text-[#142B56]",
    icon: "text-[#142B56]",
    border: "border-slate-200",
    fallback: "from-slate-50 via-white to-[#EAF3FF] text-[#52647D]",
  },
  blue: {
    text: "text-[#142B56]",
    secondary: "text-[#52647D]",
    link: "text-[#142B56]",
    icon: "text-[#142B56]",
    border: "border-[#c7dcf5]",
    fallback: "from-[#dcecff] via-[#EAF3FF] to-white text-[#52647D]",
  },
  navy: {
    text: "text-white",
    secondary: "text-[#D5E4FA]",
    link: "text-white",
    icon: "text-white",
    border: "border-white/20",
    fallback: "from-[#18376e] via-[#102653] to-[#0b1a3c] text-[#D5E4FA]",
  },
};

const kindLabel: Record<UnifiedFeedItem["kind"], string> = {
  article: "Article",
  alert: "Alert",
  report: "Accident Report",
  infrastructure: "Infrastructure Issue",
  campaign: "Campaign",
  video: "Video",
  community: "Community Post",
  update: "Administrator Update",
};

export function UnifiedFeedActivity({
  item,
  identity,
  compact = false,
  tone = "white",
}: {
  item: UnifiedFeedItem;
  identity?: Identity;
  compact?: boolean;
  tone?: FeedSurfaceTone;
}) {
  const displayName =
    identity?.name ?? (item.authorId ? "Share Barabara contributor" : "Share Barabara");
  const kind = kindLabel[item.kind];
  const timestamp = item.publishedAt ?? item.createdAt;
  const [imageFailed, setImageFailed] = useState(false);
  const hasMedia = Boolean((item.imageUrl && !imageFailed) || item.mediaUrl);
  const styles = feedSurfaceTokens[tone];

  if (compact) {
    return (
      <span
        className={`group flex min-w-0 gap-2.5 border-t ${styles.border} py-3 first:border-t-0`}
      >
        <UserAvatar
          url={identity?.avatar}
          name={displayName}
          tone={tone === "navy" ? "navy" : "light"}
          className="size-8 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${styles.secondary}`}
          >
            <span className="truncate">{displayName}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{timeAgo(timestamp)}</span>
          </span>
          <span className="mt-1 inline-flex max-w-full rounded-full bg-[#F5B51B] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#101F43]">
            {kind}
          </span>
          <span
            className={`mt-1 block line-clamp-2 text-sm font-bold leading-snug ${styles.text} group-hover:underline`}
          >
            {item.title}
          </span>
          {item.body ? (
            <span className={`mt-1 block line-clamp-2 text-xs leading-5 ${styles.secondary}`}>
              {item.body}
            </span>
          ) : null}
        </span>
        {item.imageUrl && !imageFailed ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span
            className={`flex size-14 shrink-0 items-center justify-center rounded-md bg-black/5 ${styles.secondary}`}
          >
            <Radio className={`size-4 ${styles.icon}`} aria-hidden="true" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`group flex min-w-0 flex-col overflow-hidden rounded-lg border ${styles.border} bg-transparent transition-colors hover:border-[#F5B51B]`}
    >
      <span className={`flex items-start gap-3 border-b ${styles.border} p-4 pb-3`}>
        <UserAvatar
          url={identity?.avatar}
          name={displayName}
          tone={tone === "navy" ? "navy" : "light"}
          className="size-9 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span
            className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold ${styles.text}`}
          >
            <span className="min-w-0 max-w-full truncate">{displayName}</span>
            {identity?.username ? (
              <span
                className={`min-w-0 max-w-full truncate text-xs font-normal ${styles.secondary}`}
              >
                {identity.username}
              </span>
            ) : null}
          </span>
          <span className={`mt-0.5 block text-xs ${styles.secondary}`}>{timeAgo(timestamp)}</span>
        </span>
        <span className="max-w-[42%] shrink-0 rounded-full bg-[#F5B51B] px-2.5 py-1 text-center text-[9px] font-extrabold uppercase leading-tight tracking-[0.08em] text-[#101F43]">
          {kind}
        </span>
      </span>
      {hasMedia ? (
        <span
          className={`relative block aspect-[16/9] overflow-hidden ${tone === "navy" ? "bg-[#18376e]" : "bg-slate-100"}`}
        >
          {item.imageUrl && !imageFailed ? (
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          ) : null}
          {(!item.imageUrl || imageFailed) && item.mediaUrl ? (
            <span className={`flex size-full items-center justify-center ${styles.secondary}`}>
              <Radio className={`size-8 ${styles.icon}`} aria-hidden="true" />
              <span className="sr-only">Video activity</span>
            </span>
          ) : null}
          {imageFailed && !item.mediaUrl ? (
            <span
              className={`flex size-full items-center gap-3 bg-gradient-to-br ${styles.fallback} px-4`}
            >
              <Radio className={`size-6 shrink-0 ${styles.icon}`} aria-hidden="true" />
              <span className="text-xs font-semibold">Share Barabara activity</span>
            </span>
          ) : null}
        </span>
      ) : (
        <span
          className={`flex min-h-14 items-center gap-3 border-b ${styles.border} bg-gradient-to-br ${styles.fallback} px-4 py-3`}
        >
          <Radio className={`size-5 shrink-0 ${styles.icon}`} aria-hidden="true" />
          <span className="text-xs font-semibold">Share Barabara community activity</span>
        </span>
      )}
      <span className="flex flex-1 flex-col p-4 pt-3">
        <span
          className={`line-clamp-2 text-base font-extrabold leading-snug ${styles.text} group-hover:underline`}
        >
          {item.title}
        </span>
        {item.body ? (
          <span className={`mt-2 line-clamp-3 text-sm leading-5 ${styles.secondary}`}>
            {item.body}
          </span>
        ) : null}
        <span
          className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t ${styles.border} pt-3 text-[11px] font-semibold ${styles.secondary}`}
        >
          <span className="inline-flex items-center gap-1" aria-label="Open activity">
            <ArrowUpRight className={`size-3.5 ${styles.icon}`} aria-hidden="true" /> Open activity
          </span>
          {item.kind === "community" ? (
            <span className="inline-flex items-center gap-1" aria-label="Join discussion">
              <MessageCircle className={`size-3.5 ${styles.icon}`} aria-hidden="true" /> Discussion
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
