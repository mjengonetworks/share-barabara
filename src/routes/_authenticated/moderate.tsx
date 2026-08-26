import { createFileRoute, redirect } from "@tanstack/react-router";

/** Superseded by /admin, which covers the same review queues plus the rest
 *  of the admin dashboard. Kept as a redirect so old links keep working. */
export const Route = createFileRoute("/_authenticated/moderate")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/reports" });
  },
});
