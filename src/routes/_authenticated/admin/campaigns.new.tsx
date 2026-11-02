import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/campaigns/new")({
  head: () => ({ meta: [{ title: "New Campaign: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="campaign" />,
});
