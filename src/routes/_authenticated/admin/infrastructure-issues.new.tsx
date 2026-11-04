import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/infrastructure-issues/new")({
  head: () => ({ meta: [{ title: "New Infrastructure Issue: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="infrastructure" />,
});
