import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/alerts/$alertId/edit")({
  head: () => ({ meta: [{ title: "Edit Alert: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="alert" id={Route.useParams().alertId} />,
});
