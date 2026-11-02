import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/alerts/new")({
  head: () => ({ meta: [{ title: "New Hazard Alert: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="alert" />,
});
