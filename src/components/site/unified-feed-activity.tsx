import { MessageCircle, Radio } from "lucide-react";
import { UserAvatar } from "@/components/site/user-avatar";
import { timeAgo } from "@/lib/format";
import type { UnifiedFeedItem } from "@/lib/unified-feed";

type Identity = {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
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
}: {
  item: UnifiedFeedItem;
  identity?: Identity;
  compact?: boolean;
}) {
  const displayName =
    identity?.name ?? (item.authorId ? "Share Barabara contributor" : "Share Barabara");
  const kind = kindLabel[item.kind];
  const timestamp = item.publishedAt ?? item.createdAt;
  const hasMedia = Boolean(item.imageUrl || item.mediaUrl);

  if (compact) {
    return (
      <span className="group flex min-w-0 items-center gap-2.5 border-t border-border/70 py-3 first:border-t-0">
        <UserAvatar url={identity?.avatar} name={displayName} className="size-8" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="truncate">{displayName}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{timeAgo(timestamp)}</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {kind}
          </span>
          <span className="mt-0.5 block line-clamp-2 text-sm font-bold leading-snug text-brand-navy group-hover:underline">
            {item.title}
          </span>
        </span>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="size-12 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary/60">
            <Radio className="size-4" aria-hidden="true" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/70 transition-colors hover:border-accent">
      {hasMedia ? (
        <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : null}
          {!item.imageUrl && item.mediaUrl ? (
            <span className="flex size-full items-center justify-center text-primary/70">
              <Radio className="size-8" aria-hidden="true" />
              <span className="sr-only">Video activity</span>
            </span>
          ) : null}
        </span>
      ) : (
        <span className="flex min-h-16 items-center gap-3 bg-gradient-to-br from-primary/10 via-background to-accent/15 px-4 py-3 text-primary/70">
          <Radio className="size-6 shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Share Barabara activity
          </span>
        </span>
      )}
      <span className="flex min-h-28 flex-1 flex-col p-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserAvatar url={identity?.avatar} name={displayName} className="size-6" />
          <span className="min-w-0 truncate font-semibold text-foreground">{displayName}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{timeAgo(timestamp)}</span>
        </span>
        <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          {kind}
        </span>
        <span className="mt-1 line-clamp-2 font-bold leading-snug text-brand-navy group-hover:underline">
          {item.title}
        </span>
        {item.body ? (
          <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.body}
          </span>
        ) : null}
        <span className="mt-auto flex items-center gap-3 pt-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden="true" />{" "}
            {item.kind === "community" ? "Join the discussion" : "View activity"}
          </span>
        </span>
      </span>
    </span>
  );
}
