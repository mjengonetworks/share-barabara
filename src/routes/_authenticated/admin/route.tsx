import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Activity,
  Building,
  Building2,
  Construction,
  Facebook,
  FileText,
  Handshake,
  Inbox,
  RadioTower,
  LayoutGrid,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Quote,
  ArchiveRestore,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
  Map,
} from "lucide-react";
import { ROLE_RANK, useRoles } from "@/hooks/useRoles";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { useAuth } from "@/hooks/useAuth";
import { primaryRoleLabel } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard: Share Barabara" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; minRank: number };
type NavSection = { label: string; items: NavItem[] };

/** Closes the offcanvas sidebar on mobile once a nav item is tapped, so it
 *  doesn't stay covering the page after navigating. */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton asChild isActive={active}>
      <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
        <item.icon />
        <span>{item.label}</span>
      </Link>
    </SidebarMenuButton>
  );
}

const SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutGrid, minRank: ROLE_RANK.guest_author },
      {
        to: "/admin/my-articles",
        label: "My Articles",
        icon: FileText,
        minRank: ROLE_RANK.guest_author,
      },
      { to: "/admin/my-content", label: "My Content", icon: LayoutGrid, minRank: ROLE_RANK.guest_author },
    ],
  },
  {
    label: "Content & moderation",
    items: [
      { to: "/admin/articles", label: "Articles", icon: Newspaper, minRank: ROLE_RANK.moderator },
      {
        to: "/admin/reports",
        label: "Accident Reports",
        icon: ShieldAlert,
        minRank: ROLE_RANK.moderator,
      },
      {
        to: "/admin/alerts",
        label: "Hazard Alerts",
        icon: TriangleAlert,
        minRank: ROLE_RANK.moderator,
      },
      {
        to: "/admin/infrastructure-issues",
        label: "Infrastructure Issues",
        icon: Construction,
        minRank: ROLE_RANK.moderator,
      },
      {
        to: "/admin/comments",
        label: "Comments",
        icon: MessageSquare,
        minRank: ROLE_RANK.moderator,
      },
      { to: "/admin/feed", label: "Feed Posts", icon: MessageSquare, minRank: ROLE_RANK.moderator },
      { to: "/admin/videos", label: "Media library", icon: Video, minRank: ROLE_RANK.moderator },
      { to: "/admin/requests", label: "Requests", icon: Inbox, minRank: ROLE_RANK.moderator },
    ],
  },
  {
    label: "Road safety operations",
    items: [
      { to: "/admin/incident-sources", label: "Incident Sources", icon: RadioTower, minRank: ROLE_RANK.editor },
      { to: "/admin/crash-statistics", label: "Crash Statistics", icon: BarChart3, minRank: ROLE_RANK.moderator },
      { to: "/admin/categories", label: "Taxonomy", icon: LayoutGrid, minRank: ROLE_RANK.editor },
      { to: "/admin/roads", label: "Road Registry", icon: Map, minRank: ROLE_RANK.editor },
    ],
  },
  {
    label: "Site content",
    items: [
      {
        to: "/admin/campaigns",
        label: "Campaigns",
        icon: Megaphone,
        minRank: ROLE_RANK.editor,
      },
      { to: "/admin/quote", label: "Quote of the Day", icon: Quote, minRank: ROLE_RANK.editor },
      { to: "/admin/banner-ads", label: "Banner Ads", icon: Bell, minRank: ROLE_RANK.editor },
      {
        to: "/admin/footer",
        label: "Footer & Contact",
        icon: Building2,
        minRank: ROLE_RANK.editor,
      },
      {
        to: "/admin/social-links",
        label: "Social Links",
        icon: Facebook,
        minRank: ROLE_RANK.editor,
      },
      { to: "/admin/newsletter", label: "Newsletter", icon: Mail, minRank: ROLE_RANK.editor },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        to: "/admin/merch-items",
        label: "Merch Items",
        icon: ShoppingBag,
        minRank: ROLE_RANK.editor,
      },
      {
        to: "/admin/merch-orders",
        label: "Merch Orders",
        icon: Inbox,
        minRank: ROLE_RANK.editor,
      },
    ],
  },
  {
    label: "Directory & Partners",
    items: [
      { to: "/admin/pages", label: "Pages", icon: Building, minRank: ROLE_RANK.editor },
      {
        to: "/admin/partner-enquiries",
        label: "Partner Enquiries",
        icon: Handshake,
        minRank: ROLE_RANK.editor,
      },
    ],
  },
  {
    label: "System management",
    items: [
      { to: "/admin/users", label: "Users & Roles", icon: Users, minRank: ROLE_RANK.moderator },
      { to: "/admin/notification-health", label: "Notification Health", icon: Activity, minRank: ROLE_RANK.admin },
      { to: "/admin/recycle-bin", label: "Recycle Bin", icon: ArchiveRestore, minRank: ROLE_RANK.admin },
      { to: "/admin/featured", label: "Featured Picks", icon: Sparkles, minRank: ROLE_RANK.editor },
    ],
  },
];

function AdminLayout() {
  const { rank, roles, isLoading } = useRoles();
  const { user } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-10">Checking access…</div>;
  }

  if (rank < ROLE_RANK.guest_author) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-[1.155rem] font-bold">Admin dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          This area is for approved contributors, moderators, editors and admins. Ask an admin to
          grant you a role to get access.
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
        <SidebarHeader className="px-4 py-5">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-sidebar-foreground">
            Share Barabara
          </Link>
          <p className="text-xs text-sidebar-foreground/60">Admin dashboard</p>
        </SidebarHeader>
        <SidebarContent>
          {SECTIONS.map((section) => {
            const items = section.items.filter((item) => rank >= item.minRank);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={section.label} className="px-3 py-2">
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.to} className="mb-1">
                        <NavLink item={item} active={currentPath === item.to} />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <span className="hidden text-sm font-bold sm:inline">Admin Panel</span>
          <AdminGlobalSearch />
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
              {user?.email ?? "Account"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel><span className="block truncate">{user?.email ?? "Signed-in user"}</span><span className="text-xs font-normal text-muted-foreground">Role: {primaryRoleLabel(roles)}</span></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/dashboard">Back to my activity</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => { void supabase.auth.signOut(); }}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
