import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoUrl from "@/assets/share-barabara-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { ROLE_RANK, useRoles } from "@/hooks/useRoles";
import { useProfileUsernames } from "@/lib/profiles";
import { NotificationBell } from "@/components/site/notification-bell";
import { SubscribeButton } from "@/components/site/subscribe-button";
import { HeaderSearch } from "@/components/site/header-search";
import { HeaderShareBarabaraAI } from "@/components/site/share-barabara-ai";

const NAV = [
  { to: "/news", label: "News" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/statistics", label: "Statistics" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/videos", label: "Videos" },
  { to: "/merch", label: "Merch" },
  { to: "/partner-with-us", label: "Partner With Us" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { identity, setIdentity, myPages, activePage } = useActiveIdentity();
  const { data: ownUsername = {} } = useProfileUsernames(user ? [user.id] : []);
  const { rank } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const headerRef = useRef<HTMLElement>(null);

  // Close the mobile menu on any navigation (logo, search results, browser
  // back/forward) -- not just a tap on one of the menu's own links.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close it when clicking anywhere outside the header too, since the panel
  // sits inline in the page flow rather than as a full-screen overlay.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:grid md:h-20 md:grid-cols-[auto,minmax(0,1fr),auto]">
        <button
          className="order-first flex size-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/" className="flex items-center" aria-label="Share Barabara home">
          <img src={logoUrl} alt="Share Barabara" className="h-9 w-auto sm:h-10 md:h-14 lg:h-16" />
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
                className="whitespace-nowrap rounded px-2 py-2 text-sm font-medium text-foreground transition-colors hover:text-accent lg:px-3"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2 md:ml-0">
          <HeaderSearch />
          <HeaderShareBarabaraAI />
          {user ? (
            <>
              <span className="hidden md:inline-flex"><SubscribeButton /></span>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Profile menu"
                    title={
                      activePage ? `Browsing as ${activePage.name}` : "Browsing as your profile"
                    }
                    className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    {activePage ? (
                      <Building2 className="size-5" />
                    ) : (
                      <CircleUserRound className="size-5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Browsing as</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={identity.type === "page" ? identity.pageId : "profile"}
                    onValueChange={(v) =>
                      setIdentity(
                        v === "profile" ? { type: "profile" } : { type: "page", pageId: v },
                      )
                    }
                  >
                    <DropdownMenuRadioItem value="profile">
                      <CircleUserRound className="mr-2 size-4" /> Your profile
                    </DropdownMenuRadioItem>
                    {myPages.map((p) => (
                      <DropdownMenuRadioItem key={p.id} value={p.id}>
                        <Building2 className="mr-2 size-4" /> {p.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/u/$userId" params={{ userId: ownUsername[user.id] ?? user.id }}>
                      <CircleUserRound className="mr-2 size-4" /> My profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 size-4" /> My activity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <UserCog className="mr-2 size-4" /> Profile settings
                    </Link>
                  </DropdownMenuItem>
                  {rank >= ROLE_RANK.guest_author ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <ShieldCheck className="mr-2 size-4" /> Admin dashboard
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border/60 bg-background px-4 py-3 md:hidden">
          <div className="mx-auto max-w-sm">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                activeProps={{ className: "block rounded bg-muted px-3 py-2.5 text-sm font-semibold text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-border/60 pt-3">
              {user ? (
                <Link
                  to="/u/$userId"
                  params={{ userId: ownUsername[user.id] ?? user.id }}
                  onClick={() => setOpen(false)}
                  className="flex w-2/3 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <CircleUserRound className="size-4" /> My Profile
                </Link>
              ) : (
                <Button asChild size="sm" onClick={() => setOpen(false)}>
                  <Link to="/auth">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
