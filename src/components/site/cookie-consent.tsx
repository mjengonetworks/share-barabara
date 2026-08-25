import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "sb-cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // localStorage unavailable (private mode etc): skip the prompt rather than error.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cookie className="size-5 shrink-0 text-accent" />
          We use cookies to keep you signed in and to remember your preferences.{" "}
          <Link to="/privacy" className="underline">
            Learn more
          </Link>
        </p>
        <Button size="sm" onClick={accept}>
          Accept
        </Button>
      </div>
    </div>
  );
}
