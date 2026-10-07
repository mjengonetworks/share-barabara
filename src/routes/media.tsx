import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility entry point for the branded Media & Feed destination. */
export const Route = createFileRoute("/media")({
  beforeLoad: () => {
    throw redirect({ to: "/feed" });
  },
});
