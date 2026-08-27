import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building,
  Building2,
  Construction,
  Facebook,
  FileText,
  Handshake,
  Inbox,
  LayoutGrid,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Quote,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
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
    ],
  },
  {
    label: "Moderation queue",
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
      { to: "/admin/videos", label: "Videos", icon: Video, minRank: ROLE_RANK.moderator },
      { to: "/admin/requests", label: "Requests", icon: Inbox, minRank: ROLE_RANK.moderator },
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
    label: "Administration",
    items: [
      { to: "/admin/users", label: "Users & Roles", icon: Users, minRank: ROLE_RANK.moderator },
      {
        to: "/admin/crash-statistics",
        label: "Crash Statistics",
        icon: BarChart3,
        minRank: ROLE_RANK.moderator,
      },
      { to: "/admin/featured", label: "Featured Picks", icon: Sparkles, minRank: ROLE_RANK.editor },
      {
        to: "/admin/categories",
        label: "Categories & Filters",
        icon: LayoutGrid,
        minRank: ROLE_RANK.editor,
      },
    ],
  },
];

function AdminLayout() {
  const { rank, isLoading } = useRoles();
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
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-3 py-4">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
            Share Barabara
          </Link>
          <p className="text-xs text-sidebar-foreground/60">Admin dashboard</p>
        </SidebarHeader>
        <SidebarContent>
          {SECTIONS.map((section) => {
            const items = section.items.filter((item) => rank >= item.minRank);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.to}>
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
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <SidebarTrigger />
          <Link to="/dashboard" className="ml-auto text-sm text-muted-foreground hover:underline">
            Back to my activity
          </Link>
        </header>
        <div className="flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
