import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActiveIdentity = { type: "profile" } | { type: "page"; pageId: string };

const STORAGE_KEY = "sb-active-identity";
const IDENTITY_EVENT = "sb-active-identity-changed";

function readStored(): ActiveIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { type: "profile" };
    const parsed = JSON.parse(raw);
    if (parsed?.type === "page" && typeof parsed.pageId === "string") {
      return { type: "page", pageId: parsed.pageId };
    }
  } catch {
    // ignore malformed storage
  }
  return { type: "profile" };
}

/** Pages owned by the current user, for the "post as" switcher and forms. */
export function useMyPages() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-pages-brief", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("id, slug, name, verified")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Which identity (profile or one of the user's pages) new posts/comments should be attributed to. */
export function useActiveIdentity() {
  const { user } = useAuth();
  const { data: myPages = [] } = useMyPages();
  const [identity, setIdentityState] = useState<ActiveIdentity>(() => readStored());

  useEffect(() => {
    const handler = () => setIdentityState(readStored());
    window.addEventListener(IDENTITY_EVENT, handler);
    return () => window.removeEventListener(IDENTITY_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!user) setIdentityState({ type: "profile" });
  }, [user]);

  useEffect(() => {
    if (
      identity.type === "page" &&
      myPages.length > 0 &&
      !myPages.some((p) => p.id === identity.pageId)
    ) {
      setIdentityState({ type: "profile" });
    }
  }, [identity, myPages]);

  const setIdentity = useCallback((next: ActiveIdentity) => {
    setIdentityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(IDENTITY_EVENT));
  }, []);

  const activePage =
    identity.type === "page" ? myPages.find((p) => p.id === identity.pageId) : undefined;

  return { identity, setIdentity, myPages, activePage };
}
