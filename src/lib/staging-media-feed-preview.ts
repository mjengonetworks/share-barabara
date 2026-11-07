import heroRoad from "@/assets/hero-road.jpg";
import logo from "@/assets/share-barabara-logo.png";
import type { UnifiedFeedItem } from "@/lib/unified-feed";
import { buildMediaFeedGroups, type FeedViewEvent } from "@/lib/media-feed-ranking";

const times = [
  "2026-11-06T10:00:00.000Z",
  "2026-11-06T09:45:00.000Z",
  "2026-11-06T09:30:00.000Z",
  "2026-11-06T09:15:00.000Z",
  "2026-11-06T09:00:00.000Z",
  "2026-11-06T08:45:00.000Z",
  "2026-11-06T08:30:00.000Z",
  "2026-11-06T08:15:00.000Z",
  "2026-11-06T08:00:00.000Z",
];

const records = [
  [
    "article",
    "Article",
    "Safer night travel starts with visible road markings",
    "A synthetic published article for visual review.",
    "/news/preview-article-1",
    "preview-editorial",
    heroRoad,
  ],
  [
    "alert",
    "Alert",
    "Slow down near the temporary bridge works",
    "A synthetic active road alert for visual review.",
    "/alerts/preview-alert-1",
    "preview-alerts",
    heroRoad,
  ],
  [
    "report",
    "Accident Report",
    "Community report: collision cleared from the shoulder",
    "A synthetic approved accident report for visual review.",
    "/reports/preview-report-1",
    "preview-community",
    null,
  ],
  [
    "infrastructure",
    "Infrastructure Issue",
    "Missing sign reported on the northern approach",
    "A synthetic approved infrastructure issue for visual review.",
    "/infrastructure-issues/preview-infrastructure-1",
    "preview-community",
    heroRoad,
  ],
  [
    "campaign",
    "Campaign",
    "Share the road this holiday weekend",
    "A synthetic published campaign for visual review.",
    "/campaigns/preview-campaign-1",
    "preview-campaigns",
    null,
  ],
  [
    "video",
    "Video",
    "Three checks before you join the highway",
    "A synthetic featured video activity for visual review.",
    "/videos",
    "preview-media",
    heroRoad,
  ],
  [
    "community",
    "Community Post",
    "Drivers are sharing safer passing points",
    "A synthetic public community post for visual review.",
    "/feed#post-preview-community-1",
    "preview-community",
    null,
  ],
  [
    "update",
    "Administrator Update",
    "Share Barabara expands public road-safety coverage",
    "A synthetic official update for visual review.",
    "/news/preview-update-1",
    "preview-editorial",
    heroRoad,
  ],
  [
    "article",
    "Article",
    "What a clear emergency shoulder can prevent",
    "A second synthetic published article for visual review.",
    "/news/preview-article-2",
    "preview-editorial",
    null,
  ],
] as const;

export const stagingPreviewIdentities: Record<
  string,
  { name: string; username: string; avatar: string }
> = {
  "preview-editorial": {
    name: "Share Barabara Editorial",
    username: "@sharebarabara",
    avatar: logo,
  },
  "preview-alerts": { name: "Road Safety Desk", username: "@roadsafety", avatar: logo },
  "preview-community": { name: "Community Contributor", username: "@community", avatar: logo },
  "preview-campaigns": { name: "Campaigns Team", username: "@campaigns", avatar: logo },
  "preview-media": { name: "Share Barabara Media", username: "@media", avatar: logo },
};

export const stagingPreviewFeed: UnifiedFeedItem[] = records.map((record, index) => ({
  kind: record[0],
  label: record[1],
  title: record[2],
  body: record[3],
  href: record[4],
  sourceId: `preview-${record[0]}-${index + 1}`,
  key: `${record[0]}:preview-${index + 1}`,
  location: "Synthetic preview data",
  imageUrl: record[6],
  mediaUrl: null,
  authorId: record[5],
  createdAt: times[index],
  publishedAt: times[index],
  updatedAt: null,
  status: "published",
  moderationStatus: "approved",
  hashtags: [],
  media: [],
}));

const previewNow = "2026-11-07T10:00:00.000Z";
export const stagingPreviewViewEvents: FeedViewEvent[] = [
  ...Array.from({ length: 8 }, (_, index) => ({
    activityKey: stagingPreviewFeed[3].key,
    viewedAt: `2026-11-07T0${index + 2}:00:00.000Z`,
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    activityKey: stagingPreviewFeed[4].key,
    viewedAt: `2026-11-07T0${index + 3}:15:00.000Z`,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    activityKey: stagingPreviewFeed[5].key,
    viewedAt: `2026-11-06T2${index + 1}:30:00.000Z`,
  })),
  ...Array.from({ length: 7 }, (_, index) => ({
    activityKey: stagingPreviewFeed[6].key,
    viewedAt: `2026-11-06T1${index + 2}:00:00.000Z`,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    activityKey: stagingPreviewFeed[7].key,
    viewedAt: `2026-11-06T1${index + 4}:20:00.000Z`,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    activityKey: stagingPreviewFeed[8].key,
    viewedAt: `2026-11-06T12:${index}0:00.000Z`,
  })),
];

export const stagingPreviewMediaFeedGroups = buildMediaFeedGroups(
  stagingPreviewFeed,
  stagingPreviewViewEvents,
  previewNow,
);
