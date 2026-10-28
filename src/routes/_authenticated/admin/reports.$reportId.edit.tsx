import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/reports/$reportId/edit")({
  head: () => ({ meta: [{ title: "Edit Accident Report: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="report" id={Route.useParams().reportId} />,
});
