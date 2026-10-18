import { PublicShareToolbar } from "@/components/site/article-share-toolbar";

/** Backwards-compatible name for public detail routes. */
export function ShareButtons({ title }: { title: string }) {
  return <PublicShareToolbar title={title} />;
}
