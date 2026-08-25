import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative rounded p-2 hover:bg-muted"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border p-3">
            <p className="text-sm font-semibold">Notifications</p>
            <Link
              to="/notifications"
              className="text-xs text-brand-blue underline"
              onClick={() => setOpen(false)}
            >
              See all
            </Link>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">Nothing yet.</li>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-border p-3 text-sm last:border-0 ${!n.read_at ? "bg-accent/10" : ""}`}
                >
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
