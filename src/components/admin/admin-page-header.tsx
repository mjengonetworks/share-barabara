import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  websiteHref?: string;
};

/** Shared heading treatment for management pages; public chrome stays outside admin. */
export function AdminPageHeader({ eyebrow, title, description, actions, websiteHref }: AdminPageHeaderProps) {
  return (
    <header className="border-b border-border pb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">{eyebrow}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.44375rem] font-extrabold tracking-tight">{title}</h1>
          {description ? <div className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {websiteHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={websiteHref} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-4" /> View on website</a>
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
