import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldOff, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscribe: Share Barabara" },
      {
        name: "description",
        content:
          "Subscribe to Share Barabara for a blue checkmark, an ad-free experience and the ability to rate other contributors.",
      },
    ],
  }),
  component: SubscribePage,
});

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "A blue checkmark",
    body: "Shown on your profile, comments, alerts and report bylines.",
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
      <h1 className="mt-2 text-4xl font-extrabold">Subscribe for 1 USD a year</h1>
      <p className="mt-3 text-muted-foreground">
        Personal profile verification is 1 USD per year. Page verification (for organisations) is 10
        USD per year, billed separately per app.
      </p>

      <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <b.icon className="size-6 text-accent" />
            <p className="mt-3 font-bold">{b.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-6">
        <p className="text-sm text-muted-foreground">
          Online payment (M-Pesa and PayPal) for subscriptions is coming soon. For now,{" "}
          {user ? (
            <>
              contact an admin at{" "}
              <a href="mailto:sharebarabara@gmail.com" className="underline">
                sharebarabara@gmail.com
              </a>{" "}
              to activate your subscription.
            </>
          ) : (
            <>
              <Link to="/auth" className="font-semibold underline">
                sign in
              </Link>{" "}
              first, then contact an admin to activate your subscription.
            </>
          )}
        </p>
      </div>

      <Button asChild variant="outline" className="mt-8">
        <Link to="/campaigns">Or support us with a one-off donation</Link>
      </Button>
    </div>
  );
}
