import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { safeInternalReturnTo } from "@/lib/ai/return-to-ai";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { returnTo: safeInternalReturnTo(location.href) } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
