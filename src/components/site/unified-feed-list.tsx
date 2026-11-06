import { useProfileAvatars, useProfileNames, useProfileUsernames } from "@/lib/profiles";
import type { UnifiedFeedItem } from "@/lib/unified-feed";
import { UnifiedFeedActivity } from "@/components/site/unified-feed-activity";

export function UnifiedFeedList({ items }: { items: UnifiedFeedItem[] }) {
  const authorIds = items.map((item) => item.authorId).filter((id): id is string => Boolean(id));
  const { data: names = {} } = useProfileNames(authorIds);
  const { data: usernames = {} } = useProfileUsernames(authorIds);
  const { data: avatars = {} } = useProfileAvatars(authorIds);

  return (
    <div className="mt-3 divide-y divide-border/70">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UnifiedFeedActivity
            item={item}
            compact
            identity={{
              name: item.authorId ? names[item.authorId] : undefined,
              username: item.authorId ? usernames[item.authorId] : undefined,
              avatar: item.authorId ? avatars[item.authorId] : undefined,
            }}
          />
        </a>
      ))}
    </div>
  );
}
