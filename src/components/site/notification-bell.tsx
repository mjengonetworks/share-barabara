import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CheckCheck, CircleAlert, FileText, MessageCircle, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/format";

type NotificationRow = { id: string; title: string; body: string | null; type: string; link?: string | null; source_type?: string | null; source_id?: string | null; read_at: string | null; created_at: string };
function iconFor(type: string) { if (type.includes("comment") || type.includes("reply")) return MessageCircle; if (type.includes("alert") || type.includes("hazard")) return CircleAlert; return FileText; }
function destination(n: NotificationRow) {
  if (n.link?.startsWith("/")) return n.link;
  if (!n.source_id) return null;
  if (n.source_type === "alert") return `/alerts/${n.source_id}`;
  if (n.source_type === "report") return `/reports/${n.source_id}`;
  if (n.source_type === "feed_post") return `/feed#post-${n.source_id}`;
  if (n.source_type === "comment") return `/feed#comment-${n.source_id}`;
  if (n.source_type === "campaign") return `/campaigns/${n.source_id}`;
  if (n.source_type === "infrastructure_issue") return `/infrastructure-issues/${n.source_id}`;
  return null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false); const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { notifications, unreadCount, markRead, markAllRead, isLoading, isError } = useNotifications();
  useEffect(() => { if (!open) return; const outside = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); }; const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape); return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); }; }, [open]);
  useEffect(() => setOpen(false), [pathname]);
  function openNotification(n: NotificationRow) { if (!n.read_at) markRead(n.id); const link = destination(n); if (link) { setOpen(false); void navigate({ to: link as never }); } }
  return <div ref={rootRef} className="relative">
    <button type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} aria-controls="notification-panel" onClick={() => setOpen((v) => !v)} className="relative flex size-10 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Bell className="size-5" />{unreadCount > 0 ? <span className="absolute right-0 top-0 flex min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</button>
    {open ? <div id="notification-panel" role="dialog" aria-label="Notifications" className="fixed inset-x-0 bottom-0 top-14 z-[60] flex flex-col overflow-hidden border-t border-border bg-card shadow-2xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(34rem,calc(100vh-5rem))] sm:w-[25rem] sm:rounded-xl sm:border">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="min-w-0"><h2 className="truncate text-base font-bold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p></div><div className="flex items-center gap-1">{unreadCount > 0 ? <button type="button" onClick={() => markAllRead()} className="inline-flex min-h-9 items-center gap-1 rounded px-2 text-xs font-semibold text-brand-blue hover:bg-muted"><CheckCheck className="size-4" /> Mark all read</button> : null}<button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted sm:hidden"><X className="size-5" /></button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Loading notifications…</p> : null}{isError ? <p className="p-6 text-center text-sm text-destructive">Notifications could not be loaded. Try again shortly.</p> : null}{!isLoading && !isError && notifications.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">You have no notifications yet.</p> : null}{!isLoading && !isError ? <ul className="divide-y divide-border">{(notifications as NotificationRow[]).map((n) => { const Icon = iconFor(n.type); const link = destination(n); return <li key={n.id}><button type="button" disabled={!link} onClick={() => openNotification(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${link ? "hover:bg-muted focus-visible:bg-muted" : "cursor-default"} ${!n.read_at ? "bg-accent/10" : ""}`}><span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${!n.read_at ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold leading-snug">{n.title}</span>{n.body ? <span className="mt-0.5 block break-words text-xs leading-snug text-muted-foreground">{n.body}</span> : null}<span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}{!link ? " · No longer available" : ""}</span></span>{!n.read_at ? <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-accent" /> : null}</button></li>; })}</ul> : null}</div>
    </div> : null}
  </div>;
}
