
export type CompactEditorialItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
  href: string;
  meta?: string;
};

/** Compact Article-sidebar style rows for related and latest modules. */
export function CompactEditorialList({ items }: { items: CompactEditorialItem[] }) {
  return (
    <div className="mt-3 divide-y divide-border/70">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className="flex gap-3 py-3 first:pt-0 last:pb-0 group"
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="size-16 shrink-0 rounded-md bg-primary/5" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="line-clamp-3 text-sm font-semibold leading-snug text-foreground group-hover:text-brand-blue group-hover:underline">
              {item.title}
            </span>
            {item.meta ? <span className="mt-1 block text-xs text-muted-foreground">{item.meta}</span> : null}
          </span>
        </a>
      ))}
    </div>
  );
}
