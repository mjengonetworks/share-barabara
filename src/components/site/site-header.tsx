import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

const NAV = [
  { to: "/", label: "Home" },
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center" aria-label="Share Barabara home">
          <img src={logoUrl} alt="Share Barabara" className="h-14 w-auto sm:h-16" />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <HeaderSearch />
          {user ? (
            <>
              <SubscribeButton />
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
          <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border/60 bg-background px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block rounded px-2 py-2 text-sm font-medium text-muted-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
