import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "sb-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability degrades gracefully without it; not worth surfacing to the user.
      });
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {
        // ignore
      }
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-xl card-elevated">
      <div className="flex items-start gap-3">
        <Download className="size-6 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold">Install Share Barabara</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add Share Barabara to your home screen for quick access to alerts and reports.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>Install</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
