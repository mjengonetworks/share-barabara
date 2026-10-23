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

export const EDITORIAL_DISCOVERY_DESTINATIONS = [
  { key: "news", label: "News & Articles", description: "Reporting and road-safety stories.", to: "/news", icon: Newspaper },
  { key: "alerts", label: "Alerts & Advisories", description: "Current hazards and travel warnings.", to: "/alerts", icon: BellRing },
  { key: "reports", label: "Accident Reports", description: "Approved community incident reports.", to: "/reports", icon: FileWarning },
  { key: "statistics", label: "Statistics & Maps", description: "Explore published road-safety data.", to: "/statistics", icon: ChartNoAxesColumn },
  { key: "feed", label: "Media & Feed", description: "Compact community updates and media.", to: "/feed", icon: Radio },
  { key: "campaigns", label: "Campaigns", description: "Road-safety campaigns and participation.", to: "/campaigns", icon: BriefcaseBusiness },
  { key: "infrastructure", label: "Infrastructure Issues", description: "Browse approved road and infrastructure issues.", to: "/infrastructure-issues", icon: Library },
  { key: "pages", label: "Community Pages", description: "Organisations and road-safety advocates.", to: "/pages/", icon: BarChart3 },
] as const;

export function EditorialDiscoveryRail({ exclude, start = 0 }: { exclude?: string; start?: number }) {
  const destinations = EDITORIAL_DISCOVERY_DESTINATIONS.filter((item) => item.key !== exclude);
  const ordered = [...destinations.slice(start), ...destinations.slice(0, start)];

  return (
    <section className="rounded-xl border border-brand-blue/20 bg-primary/[0.035] p-4 sm:p-5" aria-label="Explore Share Barabara">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">Explore Share Barabara</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">Keep browsing trusted road information</h2>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-brand-blue" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map(({ key, label, description, to, icon: Icon }) => (
          <Link key={key} to={to as never} className="group flex min-w-0 items-start gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-navy group-hover:underline">{label}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{description}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
