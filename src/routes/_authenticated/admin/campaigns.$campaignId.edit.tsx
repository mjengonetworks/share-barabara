import { createFileRoute } from "@tanstack/react-router";
import { EditorialRecordEditor } from "@/components/admin/editorial-record-editor";

export const Route = createFileRoute("/_authenticated/admin/campaigns/$campaignId/edit")({
  head: () => ({ meta: [{ title: "Edit Campaign: Share Barabara Admin" }] }),
  component: () => <EditorialRecordEditor type="campaign" id={Route.useParams().campaignId} />,
});
