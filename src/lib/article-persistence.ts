import { slugify } from "./format";

export type ArticleStatus = "draft" | "pending_review" | "published";
export type ArticlePersistenceValue = Record<string, unknown> & {
  title: string;
  summary: string;
  body: string;
  source: string;
  category?: string;
  categories?: string[];
  image_url: string;
  image_alt: string;
  image_caption: string;
  image_credit: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
};

export function resolveArticleStatus(requestedStatus: unknown, canReview: boolean): ArticleStatus {
  if (requestedStatus === "published" && canReview) return "published";
  if (requestedStatus === "pending_review") return "pending_review";
  return "draft";
}

export function buildArticlePersistencePayload(form: ArticlePersistenceValue, status: ArticleStatus, userId: string | null, isEditing: boolean): ArticlePersistenceValue {
  return {
    title: form.title,
    summary: form.summary,
    body: form.body,
    source: form.source.trim() || null,
    category: form.categories?.[0] || form.category || "News",
    categories: form.categories ?? [],
    image_url: form.image_url.trim() || null,
    image_alt: form.image_alt.trim() || null,
    image_caption: form.image_caption.trim() || null,
    image_credit: form.image_credit.trim() || null,
    featured: form.featured,
    status,
    ...(!isEditing ? { slug: slugify(form.title), author_id: userId } : {}),
    ...(status === "published" ? { published_at: new Date().toISOString(), reviewed_by: userId, reviewed_at: new Date().toISOString() } : {}),
    seo_title: form.seo_title,
    seo_description: form.seo_description,
    seo_keywords: form.seo_keywords,
  };
}
