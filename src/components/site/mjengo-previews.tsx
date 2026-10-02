import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, ExternalLink, MapPin, Play, Radio } from "lucide-react";
import { getMjengoContent, type MjengoArticlePreview, type MjengoProjectPreview } from "@/lib/mjengo.functions";

type Context = "home" | "articles" | "alerts" | "reports" | "statistics" | "media" | "feed";

const contextCopy: Record<Context, { eyebrow: string; title: string; description: string }> = {
  home: { eyebrow: "From Mjengo Hub", title: "Infrastructure stories and projects to watch", description: "Selected public content from Mjengo Hub, clearly attributed and linked to the original source." },
  articles: { eyebrow: "Built environment context", title: "More from Mjengo Hub", description: "Infrastructure and real-estate reporting from Mjengo Hub, presented as external source material." },
  alerts: { eyebrow: "Infrastructure context", title: "Projects connected to the roads we use", description: "Follow infrastructure reporting and project updates from Mjengo Hub. These are external source previews, not Share Barabara alerts." },
  reports: { eyebrow: "Built environment context", title: "Construction and transport context", description: "External reporting and project tracking that may help place community reports in context." },
  statistics: { eyebrow: "External context", title: "Infrastructure reporting from Mjengo Hub", description: "Additional context from Mjengo Hub. This does not change or supplement the official/statistical definitions above." },
  media: { eyebrow: "Mjengo Hub media", title: "Infrastructure media from Mjengo Hub", description: "Publicly linked Mjengo Hub videos and project previews. Playback remains on the source platform." },
  feed: { eyebrow: "External source previews", title: "Infrastructure and project updates", description: "Published Mjengo Hub articles, public media and project previews, shown with source attribution and links to the original content." },
};

function ArticleCard({ item }: { item: MjengoArticlePreview }) {
  return <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent">
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center bg-primary/5 text-primary/50" aria-hidden="true"><Building2 className="size-8" /></div>}
    <div className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Mjengo Hub · {item.category}</p><h3 className="mt-1 line-clamp-2 font-bold leading-snug group-hover:underline">{item.title}</h3>{item.summary ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p> : null}{item.author ? <p className="mt-2 text-xs text-muted-foreground">By {item.author}</p> : null}<span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">Read source <ArrowUpRight className="size-3.5" /></span></div>
  </a>;
}

function ProjectCard({ item }: { item: MjengoProjectPreview }) {
  return <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent">
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center bg-primary/5 text-primary/50" aria-hidden="true"><Building2 className="size-8" /></div>}
    <div className="p-4"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{item.status ? <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">{item.status}</span> : null}{item.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{item.location}</span> : null}</div><h3 className="mt-3 line-clamp-2 font-bold leading-snug group-hover:underline">{item.title}</h3><p className="mt-2 text-xs text-muted-foreground">Source: Mjengo Hub</p></div>
  </a>;
}

export function MjengoPreviews({ context }: { context: Context }) {
  const { data } = useQuery({ queryKey: ["mjengo-content"], queryFn: () => getMjengoContent(), staleTime: 300_000, retry: 1 });
  if (!data || data.status !== "ok") return null;
  const copy = contextCopy[context];
  const articles = data.articles.filter((item) => context === "articles" || context === "home" || ["Infrastructure", "Real Estate", "Affordable Housing Program"].includes(item.category)).slice(0, 3);
  const projects = data.projects.slice(0, 3);
  const media = data.media.slice(0, 3);
  return <section className="mt-12 border-t border-border pt-10" aria-label="Mjengo Hub source previews"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">{copy.eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{copy.title}</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{copy.description}</p></div>
    <div className="grid gap-8 lg:grid-cols-2">{articles.length ? <div><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Infrastructure & real-estate articles</h3><a href="https://mjengohub.co.ke/articles" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">All articles <ExternalLink className="size-3.5" /></a></div><div className="grid gap-4 sm:grid-cols-3">{articles.map((item) => <ArticleCard key={item.id} item={item} />)}</div></div> : null}{projects.length ? <div><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Project Tracker</h3><a href="https://mjengohub.co.ke/projects" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">Open tracker <ExternalLink className="size-3.5" /></a></div><div className="grid gap-4 sm:grid-cols-3">{projects.map((item) => <ProjectCard key={item.id} item={item} />)}</div></div> : null}</div>
    {media.length ? <div className="mt-8"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-bold"><Radio className="size-5 text-accent" /> Mjengo Hub Media</h3><a href="https://mjengohub.co.ke/media" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">View media <ExternalLink className="size-3.5" /></a></div><div className="grid gap-4 sm:grid-cols-3">{media.map((item) => <a key={item.id} href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-lg border border-border bg-card"><div className="relative">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-primary/5" aria-hidden="true" />}<Play className="absolute left-3 top-3 size-8 rounded-full bg-primary/90 p-2 text-primary-foreground" /></div><p className="p-4 font-semibold group-hover:underline">{item.title}</p></a>)}</div></div> : null}
  </section>;
}
