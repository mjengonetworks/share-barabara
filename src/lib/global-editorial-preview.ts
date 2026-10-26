export type PreviewDestination = "news" | "alerts" | "reports" | "campaigns" | "infrastructure";

export type PreviewItem = {
  id: string;
  title: string;
  href: string;
  imageUrl?: string | null;
  category?: string | null;
  destination: PreviewDestination;
  categoryKey?: string | null;
  recordedViewRank?: number;
};

export type PreviewCard = {
  key: string;
  title: string;
  items: PreviewItem[];
  ranked: boolean;
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export function rankPreviewCategories(items: PreviewItem[]) {
  const groups = new Map<string, PreviewItem[]>();
  for (const item of items) {
    const key = normalize(item.categoryKey);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([, left], [, right]) => {
      const leftRank = Math.min(
        ...left.map((item) => item.recordedViewRank ?? Number.MAX_SAFE_INTEGER),
      );
      const rightRank = Math.min(
        ...right.map((item) => item.recordedViewRank ?? Number.MAX_SAFE_INTEGER),
      );
      return leftRank - rightRank || normalize(left[0]?.categoryKey).localeCompare(normalize(right[0]?.categoryKey));
    })
    .map(([key, items]) => ({ key, label: items[0].categoryKey ?? key, items }));
}

export function buildPreviewCards(
  latest: PreviewItem[],
  ranked: PreviewItem[],
  labels: { latest: string },
): PreviewCard[] {
  const unique = (items: PreviewItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const cards: PreviewCard[] = [
    {
      key: "latest",
      title: labels.latest,
      items: unique(latest).slice(0, 3),
      ranked: false,
    },
  ];
  for (const category of rankPreviewCategories(ranked).slice(0, 2)) {
    cards.push({
      key: "category-" + category.key,
      title: category.label,
      items: unique(category.items).slice(0, 3),
      ranked: true,
    });
  }
  return cards;
}
