import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArticleForm } from "@/components/site/article-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const Route = createFileRoute("/_authenticated/admin/my-articles/new")({
  head: () => ({ meta: [{ title: "New Article: Share Barabara Admin" }] }),
  component: NewMyArticlePage,
});

function NewMyArticlePage() {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-4xl space-y-6">
      <AdminPageHeader
        eyebrow="My articles"
        title="New article"
        description="Draft an article for editorial review. Your work remains on this full page until you save or submit it."
        websiteHref="/news"
      />
      <ArticleForm editorial onDone={() => void navigate({ to: "/admin/my-articles" })} />
    </div>
  );
}
