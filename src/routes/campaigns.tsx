import { createFileRoute } from "@tanstack/react-router";
import { HandHeart, Megaphone, Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns: Share Barabara" },
      {
        name: "description",
        content:
          "Share Barabara's road safety campaigns, upcoming events and how to support the platform.",
      },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Campaigns
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Share Barabara</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Share Barabara, part of Mjengo Networks Limited, is a platform dedicated to promoting safer
        roads for all users. We welcome all partnerships and support as we work to transform how
        drivers, riders, pedestrians and other road users approach road safety. Together, we can
        build a culture where every road user understands that conscious daily choices save lives.
      </p>

      <section className="mt-10 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <RouteIcon className="size-5 text-accent" /> Share Barabara: share the road
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our main, continuous campaign: a call for every road user, whether behind the wheel, on
          two wheels or on foot, to share the road with care.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Megaphone className="size-5 text-accent" /> Upcoming activities
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Share Barabara Walk, hospital visits to road crash victims, and county safety drives
          are being planned. Check back here for dates, or follow us on social media for
          announcements.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <HandHeart className="size-5 text-accent" /> Support Share Barabara
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Donations fund campaigns like the Share Barabara Walk and hospital visits to crash
          victims.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-bold">M-Pesa</p>
            <p className="mt-1 text-lg font-semibold text-accent-foreground">0701 951 682</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-bold">PayPal</p>
            <p className="mt-1 text-lg font-semibold text-accent-foreground">phmuok@gmail.com</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">More payment options are coming soon.</p>
      </section>
    </div>
  );
}
