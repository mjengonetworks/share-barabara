import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/articles/$articleId/edit")({
  head: () => ({ meta: [{ title: "Edit Article: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="article" id={Route.useParams().articleId} />,
});
