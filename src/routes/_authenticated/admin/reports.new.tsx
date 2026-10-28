import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/reports/new")({
  head: () => ({ meta: [{ title: "New Accident Report: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="report" />,
});
