import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, PenLine, ShieldOff, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_BILLING_PERIOD, SUBSCRIPTION_PRODUCTS } from "@/lib/subscriptions";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscribe: Share Barabara" },
      {
        name: "description",
        content:
          "Annual Blue and Gold subscription options for Share Barabara profiles and pages.",
      },
    ],
  }),
  component: SubscribePage,
});

const EXISTING_BENEFITS = [
  {
    icon: BadgeCheck,
    title: "A blue checkmark",
    body: "Shown on your profile, comments, alerts and report bylines.",
  },
  {
    icon: PenLine,
    title: "Write articles",
    body: "Submit articles for our editors to review and publish under your byline.",
  },
  {
    icon: ShieldOff,
    title: "No more Google ads",
    body: "Internal banner ads supporting the platform still show, at most two per page.",
  },
  {
    icon: Star,
    title: "Rate other contributors",
    body: "Give 1 to 5 stars to any contributor, feeding their level and badges.",
  },
];

function SubscribePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Support Share Barabara
      </p>
      <h1 className="mt-2 text-[1.7325rem] font-extrabold">Profile and Page subscriptions</h1>
      <p className="mt-3 text-muted-foreground">
        Blue and Gold are paid subscription badges. They do not create or increase a contributor’s
        earned reputation level, reviews, endorsements or contribution history.
      </p>

      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PRODUCTS.map((product) => (
          <div key={product.label} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <BadgeCheck className={product.tier === "gold" ? "size-6 text-caution" : "size-6 text-brand-blue"} />
            <p className="mt-3 font-bold">{product.label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold">KES {product.amountKes.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">per {SUBSCRIPTION_BILLING_PERIOD}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-left text-[1.155rem] font-bold">Existing subscription-linked capabilities</h2>
      <div className="mt-4 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
        {EXISTING_BENEFITS.map((b) => (
          <div key={b.title} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <b.icon className="size-6 text-accent" />
            <p className="mt-3 font-bold">{b.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-6">
        <p className="text-sm text-muted-foreground">
          Online purchase and payment confirmation for subscriptions are not available yet. These
          displayed products do not activate an entitlement. For existing manual subscription
          support, contact an admin at{" "}
          {user ? (
            <>
              <a href="mailto:sharebarabara@gmail.com" className="underline">
                sharebarabara@gmail.com
              </a>{" "}
            </>
          ) : (
            <>
              <Link to="/auth" className="font-semibold underline">
                sign in
              </Link>{" "}
              first, then contact an admin at{" "}
              <a href="mailto:sharebarabara@gmail.com" className="underline">
                sharebarabara@gmail.com
              </a>
              .
            </>
          )}
        </p>
      </div>

      <Button asChild variant="outline" className="mt-8">
        <Link to="/campaigns" hash="donate">
          Or support us with a one-off donation
        </Link>
      </Button>
    </div>
  );
}
