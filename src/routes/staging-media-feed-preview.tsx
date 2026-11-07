import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const PreviewComponent =
  import.meta.env.VITE_DEPLOYMENT_ENV === "staging-preview"
    ? lazy(() =>
        import("@/components/site/staging-media-feed-preview").then((module) => ({
          default: module.StagingMediaFeedPreview,
        })),
      )
    : () => null;

export const Route = createFileRoute("/staging-media-feed-preview")({
  component: PreviewComponent,
});
