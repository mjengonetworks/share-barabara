export type CategorizedPublishedItem = {
  id: string;
  category?: string | null;
  published_at?: string | null;
};

export function groupLatestByEntity<T extends CategorizedPublishedItem>(
  items: T[],
  getEntity: (item: T) => string | null | undefined = (item) => item.category,
  getPublishedAt: (item: T) => string | null | undefined = (item) => item.published_at,
) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const entity = getEntity(item)?.trim();
    if (!entity) continue;
    const group = groups.get(entity) ?? [];
    if (!group.some((candidate) => candidate.id === item.id)) group.push(item);
    groups.set(entity, group);
  }

  return Array.from(groups.entries())
    .map(([entity, records]) => ({
      entity,
      items: [...records]
        .sort(
          (a, b) =>
            (Date.parse(getPublishedAt(b) ?? "") || 0) -
              (Date.parse(getPublishedAt(a) ?? "") || 0),
        )
        .slice(0, 3),
    }))
    .filter((group) => group.items.length > 0);
}
