import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  FileWarning,
  Library,
  Newspaper,
  Radio,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PUBLIC_NAV_ITEMS } from "@/lib/public-navigation";

const DESTINATION_META = {
  news: { label: "News & Articles", description: "Reporting and road-safety stories.", icon: Newspaper },
  alerts: { label: "Alerts & Advisories", description: "Current hazards and travel warnings.", icon: BellRing },
  reports: { label: "Accident Reports", description: "Approved community incident reports.", icon: FileWarning },
  statistics: { label: "Statistics & Maps", description: "Explore published road-safety data.", icon: ChartNoAxesColumn },
  feed: { label: "Media & Feed", description: "Compact community updates and media.", icon: Radio },
  campaigns: { label: "Campaigns", description: "Road-safety campaigns and participation.", icon: BriefcaseBusiness },
  infrastructure: { label: "Infrastructure Issues", description: "Browse approved road and infrastructure issues.", icon: Library },
  pages: { label: "Community Pages", description: "Organisations and road-safety advocates.", icon: BarChart3 },
} as const;

const SECONDARY_DESTINATIONS = [
  { key: "infrastructure", to: "/infrastructure-issues" },
  { key: "pages", to: "/pages/" },
] as const;

export const EDITORIAL_DISCOVERY_DESTINATIONS = [
  ...PUBLIC_NAV_ITEMS
    .filter((item) => item.key in DESTINATION_META)
    .map((item) => ({ ...item, ...DESTINATION_META[item.key as keyof typeof DESTINATION_META] })),
  ...SECONDARY_DESTINATIONS.map((item) => ({ ...item, ...DESTINATION_META[item.key] })),
] as const;

export function EditorialDiscoveryRail({ exclude }: { exclude?: string }) {
  const destinations = EDITORIAL_DISCOVERY_DESTINATIONS.filter((item) => item.key !== exclude);

  return (
    <section className="rounded-xl border border-brand-blue/20 bg-primary/[0.035] p-4 sm:p-5" aria-label="Explore Share Barabara">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">Explore Share Barabara</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">Keep browsing trusted road information</h2>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-brand-blue" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {destinations.map(({ key, label, description, to, icon: Icon }) => (
          <Link key={key} to={to as never} className="group flex min-w-0 items-start gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-navy group-hover:underline">{label}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{description}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
