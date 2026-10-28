import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/infrastructure-issues/$issueId/edit")({
  head: () => ({ meta: [{ title: "Edit Infrastructure Issue: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="infrastructure" id={Route.useParams().issueId} />,
});
