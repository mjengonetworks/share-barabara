import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type HeroLink = {
  label: string;
  to: string;
};

type Breadcrumb = {
  label: string;
  to?: string;
};

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  breadcrumbs?: Breadcrumb[];
  primaryCta?: HeroLink;
  secondaryCta?: HeroLink;
  children?: ReactNode;
};

/** Compact editorial hero for public landing pages. The homepage keeps its own flagship hero. */
export function PublicPageHero({
  eyebrow,
  title,
  description,
  image,
  breadcrumbs,
  primaryCta,
  secondaryCta,
  children,
}: PublicPageHeroProps) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-2xl border border-border bg-primary text-primary-foreground shadow-sm"
      aria-labelledby="public-page-hero-title"
    >
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-primary/90" aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-gradient-to-l from-accent/20 to-transparent" aria-hidden="true" />

      <div className="relative px-5 py-7 sm:px-8 sm:py-9">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-primary-foreground/75">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.to ? (
                    <Link to={crumb.to} className="underline-offset-4 hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
        <h1
          id="public-page-hero-title"
          className="mt-2 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
          {description}
        </p>

        {primaryCta || secondaryCta || children ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {primaryCta ? (
              <Button asChild>
                <Link to={primaryCta.to}>
                  {primaryCta.label} <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            ) : null}
            {secondaryCta ? (
              <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
              </Button>
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
