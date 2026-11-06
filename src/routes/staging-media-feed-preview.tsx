import { createFileRoute } from "@tanstack/react-router";
import { StagingMediaFeedPreview } from "@/components/site/staging-media-feed-preview";

export const Route = createFileRoute("/staging-media-feed-preview")({ component: StagingMediaFeedPreview });
