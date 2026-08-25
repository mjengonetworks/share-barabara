/**
 * In-memory data store for local UI testing (see README-mock-api.md).
 * Only tables that depend on the not-yet-applied migration are mocked here;
 * everything else still hits the real Supabase project.
 */

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

const seedNewsId1 = uuid();
const seedNewsId2 = uuid();
const seedAlertId1 = uuid();
const seedReportId1 = uuid();

export const store: Record<string, Record<string, unknown>[]> = {
  news: [
    {
      id: seedNewsId1,
      slug: "mock-ntsa-crackdown",
      title: "NTSA launches nationwide crackdown on night-time speeding",
      summary: "Traffic officers and NTSA inspectors will run 24-hour highway patrols.",
      body: "Mock article body for local testing.\n\nSecond paragraph.",
      category: "Enforcement",
      source: "NTSA",
      image_url: null,
      featured: true,
      author_id: null,
      status: "published",
      reviewed_by: null,
      reviewed_at: null,
      published_at: now(),
      created_at: now(),
      updated_at: now(),
    },
    {
      id: seedNewsId2,
      slug: "mock-pending-article",
      title: "[MOCK] A pending article waiting for review",
      summary: "This exists so the moderation queue has something to show.",
      body: "Mock pending article body.\n\nSubmitted for testing the review flow.",
      category: "News",
      source: null,
      image_url: null,
      featured: false,
      author_id: "mock-author",
      status: "pending_review",
      reviewed_by: null,
      reviewed_at: null,
      published_at: now(),
      created_at: now(),
      updated_at: now(),
    },
  ],
  comments: [],
  votes: [],
  notifications: [],
  notification_preferences: [],
  roads: [],
  subscriptions: [],
  user_ratings: [],
  banner_ads: [],
  partner_enquiries: [],
  videos: [],
  site_quote: [
    { id: 1, quote: "Every journey home should end at home.", author: "Share Barabara", updated_at: now(), updated_by: null },
  ],
  quote_submissions: [],
  merch_items: [],
  merch_orders: [],
  news_views: [],
  alerts: [
    {
      id: seedAlertId1,
      user_id: "mock-user",
      title: "[MOCK] Pothole near Westlands roundabout",
      description: "Deep pothole on the inside lane, hard to see at night.",
      county: "Nairobi",
      road: "Waiyaki Way",
      road_id: null,
      hazard_type: "road_damage",
      severity: "medium",
      status: "active",
      latitude: null,
      longitude: null,
      created_at: now(),
      updated_at: now(),
    },
  ],
  accident_reports: [
    {
      id: seedReportId1,
      user_id: "mock-user",
      title: "[MOCK] Two-vehicle collision on Thika Road",
      description: "Mock report body for local testing.",
      county: "Kiambu",
      road: "Thika Road",
      road_id: null,
      occurred_at: now(),
      vehicles_involved: 2,
      casualties: 1,
      fatalities: 0,
      severity: "moderate",
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      editor_note: null,
      rejection_reason: null,
      latitude: null,
      longitude: null,
      created_at: now(),
      updated_at: now(),
    },
  ],
};

export function nextId(): string {
  return uuid();
}

export function nowIso(): string {
  return now();
}
