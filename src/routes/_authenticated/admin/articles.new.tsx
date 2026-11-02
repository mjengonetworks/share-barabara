import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/articles/new")({
  head: () => ({ meta: [{ title: "New Article: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="article" />,
});
