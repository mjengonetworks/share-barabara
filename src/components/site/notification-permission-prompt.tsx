import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const KEY = "sb-notif-prompt-dismissed";

export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      // ignore
    }
    setShow(true);
  }, [user]);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }

  async function enable() {
    await Notification.requestPermission();
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-xl card-elevated">
      <div className="flex items-start gap-3">
        <BellRing className="size-6 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold">Turn on notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Get notified about hazard alerts near you, replies to your comments, and updates on
            your submissions while Share Barabara is open in this browser.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enable}>Turn on</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
