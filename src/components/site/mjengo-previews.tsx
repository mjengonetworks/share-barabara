import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, ExternalLink, MapPin, Play, Radio } from "lucide-react";
import { getMjengoContent, type MjengoArticlePreview, type MjengoProjectPreview } from "@/lib/mjengo.functions";

type Context = "home" | "articles" | "alerts" | "reports" | "statistics" | "media" | "feed";
type MediaPreview = { id: string; title: string; imageUrl: string | null; canonicalUrl: string };

function ExternalLinkLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">{children}<ExternalLink className="size-3.5" aria-hidden="true" /></span>;
}

function ArticleCard({ item }: { item: MjengoArticlePreview }) {
  return <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent">
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-md object-cover" /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary/50" aria-hidden="true"><Building2 className="size-6" /></div>}
    <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Mjengo Hub · {item.category}</p><h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug group-hover:underline">{item.title}</h3>{item.author ? <p className="mt-1 text-[11px] text-muted-foreground">By {item.author}</p> : null}</div>
  </a>;
}

function ProjectCard({ item }: { item: MjengoProjectPreview }) {
  return <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent">
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-md object-cover" /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary/50" aria-hidden="true"><Building2 className="size-6" /></div>}
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">{item.status ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{item.status}</span> : null}{item.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{item.location}</span> : null}</div><h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug group-hover:underline">{item.title}</h3><p className="mt-1 text-[11px] text-muted-foreground">Source: Mjengo Hub</p></div>
  </a>;
}

function MediaCard({ item }: { item: MediaPreview }) {
  return <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent">
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-md object-cover" /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary/50" aria-hidden="true"><Play className="size-5" /></div>}
    <h3 className="line-clamp-3 self-center text-sm font-bold leading-snug group-hover:underline">{item.title}</h3>
  </a>;
}

function MjengoHubCard({ media }: { media: MediaPreview[] }) {
  return <section className="rounded-xl border border-border bg-card p-4 card-elevated">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Platform &amp; media</p><h3 className="mt-1 text-lg font-bold">Mjengo Hub Home &amp; Media</h3></div><Building2 className="size-5 shrink-0 text-accent" aria-hidden="true" /></div>
    <p className="mt-2 text-sm text-muted-foreground">Construction, infrastructure, engineering and built-environment coverage from Mjengo Hub.</p>
    <a href="https://mjengohub.co.ke" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline">Visit Mjengo Hub home <ArrowUpRight className="size-4" /></a>
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><a href="https://mjengohub.co.ke/media" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold hover:underline"><Radio className="size-4 text-accent" /> Mjengo Hub Media</a><a href="https://mjengohub.co.ke/media" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Open media</ExternalLinkLabel></a></div>
    {media.length ? <div className="mt-3 space-y-2">{media.slice(0, 2).map((item) => <MediaCard key={item.id} item={item} />)}</div> : <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Explore the verified Mjengo Hub Media &amp; Feed destination for public media previews.</p>}
  </section>;
}

function MjengoNetworksSection() {
  return <section className="mt-10 border-t border-border pt-10" aria-label="Mjengo Networks discovery">
    <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Professional construction network</p><h2 className="mt-1 text-2xl font-bold">Mjengo Networks</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">A public network for finding fundis, suppliers, contractors, consultants, jobs, events and construction services in Kenya.</p><a href="https://mjengonetworks.co.ke" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline">Visit Mjengo Networks home <ArrowUpRight className="size-4" /></a></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-border bg-card p-4 card-elevated"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Home &amp; media</p><h3 className="mt-1 text-lg font-bold">Media &amp; Feed</h3><p className="mt-2 text-sm text-muted-foreground">Short professional pitches and public network updates.</p><div className="mt-4 flex flex-wrap gap-3"><a href="https://mjengonetworks.co.ke" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Network home</ExternalLinkLabel></a><a href="https://mjengonetworks.co.ke/feed?view=media" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Open Media &amp; Feed</ExternalLinkLabel></a></div></section>
      <section className="rounded-xl border border-border bg-card p-4 card-elevated"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Opportunities</p><h3 className="mt-1 text-lg font-bold">Jobs, Tenders, Events &amp; Joining</h3><p className="mt-2 text-sm text-muted-foreground">Browse verified public destinations for network opportunities and participation.</p><div className="mt-4 flex flex-wrap gap-3"><a href="https://mjengonetworks.co.ke/jobs-tenders" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Jobs &amp; Tenders</ExternalLinkLabel></a><a href="https://mjengonetworks.co.ke/events" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Events</ExternalLinkLabel></a><a href="https://mjengonetworks.co.ke" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Join the network</ExternalLinkLabel></a></div></section>
      <section className="rounded-xl border border-border bg-card p-4 card-elevated"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Suppliers &amp; services</p><h3 className="mt-1 text-lg font-bold">Suppliers &amp; Get a Quote</h3><p className="mt-2 text-sm text-muted-foreground">Find suppliers and request construction services through the network’s public tools.</p><div className="mt-4 flex flex-wrap gap-3"><a href="https://mjengonetworks.co.ke/suppliers" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Supplier directory</ExternalLinkLabel></a><a href="https://mjengonetworks.co.ke/directory" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Full directory</ExternalLinkLabel></a><a href="https://mjengonetworks.co.ke/quote" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Get a Quote</ExternalLinkLabel></a></div></section>
    </div>
  </section>;
}

export function MjengoPreviews({ context }: { context: Context }) {
  const { data } = useQuery({ queryKey: ["mjengo-content"], queryFn: () => getMjengoContent(), staleTime: 300_000, retry: 1 });
  const articles = (data?.articles ?? []).filter((item) => context === "articles" || context === "home" || ["Infrastructure", "Real Estate", "Affordable Housing Program"].includes(item.category)).slice(0, 3);
  const projects = (data?.projects ?? []).slice(0, 3);
  const media = (data?.media ?? []).slice(0, 3);
  return <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
    <section className="mt-12 border-t border-border pt-10" aria-label="Mjengo Hub discovery">
      <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Ecosystem discovery</p><h2 className="mt-1 text-2xl font-bold">Mjengo Hub</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Explore construction, infrastructure, engineering and built-environment reporting, media and project tracking from Mjengo Hub.</p><a href="https://mjengohub.co.ke" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline">Visit Mjengo Hub home <ArrowUpRight className="size-4" /></a></div>
      <div className="grid gap-4 lg:grid-cols-3"><MjengoHubCard media={media} /><section className="rounded-xl border border-border bg-card p-4 card-elevated"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Editorial</p><h3 className="mt-1 text-lg font-bold">Mjengo Hub Articles</h3></div><a href="https://mjengohub.co.ke/articles" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>All articles</ExternalLinkLabel></a></div>{articles.length ? <div className="mt-4 space-y-2">{articles.map((item) => <ArticleCard key={item.id} item={item} />)}</div> : <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Read the latest published articles on Mjengo Hub.</p>}</section><section className="rounded-xl border border-border bg-card p-4 card-elevated"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Projects</p><h3 className="mt-1 text-lg font-bold">Project Tracker</h3></div><a href="https://mjengohub.co.ke/projects" target="_blank" rel="noopener noreferrer"><ExternalLinkLabel>Open tracker</ExternalLinkLabel></a></div>{projects.length ? <div className="mt-4 space-y-2">{projects.map((item) => <ProjectCard key={item.id} item={item} />)}</div> : <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Browse published Mjengo Hub projects and their verified locations/statuses.</p>}</section></div>
    </section>
    <MjengoNetworksSection />
  </div>;
}
