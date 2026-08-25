import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [{ title: "Site Map: Share Barabara" }],
  }),
  component: SitemapPage,
});

const SECTIONS = [
  {
    title: "Explore",
    links: [
      { to: "/", label: "Home" },
      { to: "/news", label: "News" },
      { to: "/alerts", label: "Alerts" },
      { to: "/reports", label: "Reports" },
      { to: "/statistics", label: "Statistics" },
      { to: "/campaigns", label: "Campaigns" },
      { to: "/videos", label: "Videos" },
      { to: "/merch", label: "Merch" },
      { to: "/safety", label: "Safety guidance" },
      { to: "/search", label: "Search" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/auth", label: "Sign in" },
      { to: "/dashboard", label: "My dashboard" },
      { to: "/notifications", label: "Notifications" },
      { to: "/subscribe", label: "Subscribe" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/partner-with-us", label: "Partner with us" },
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of use" },
    ],
  },
];

function SitemapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Navigate</p>
      <h1 className="mt-2 text-4xl font-extrabold">Site map</h1>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {s.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
