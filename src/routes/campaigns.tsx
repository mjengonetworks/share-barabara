import { createFileRoute } from "@tanstack/react-router";
import { HandHeart, Megaphone, PhoneCall, Route as RouteIcon } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import { FeaturedPageCard, FeaturedProfileCard } from "@/components/site/featured-cards";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns: Share Barabara" },
      {
        name: "description",
        content:
          "Share Barabara's road safety campaigns, emergency numbers, upcoming events and how to support the platform.",
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

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <FeaturedProfileCard slot="campaigns_profile_of_day" />
        <FeaturedPageCard slot="campaigns_page_of_day" />
      </section>

      <section id="emergency" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-2">
        <div className="rounded-lg asphalt p-8 text-secondary">
          <h2 className="text-2xl font-bold text-background">At a crash scene</h2>
          <ol className="mt-4 space-y-3 text-sm text-secondary/80">
            <li>1. Stop safely, switch on hazard lights and place a warning triangle well back.</li>
            <li>2. Call 999 or 112. Give the road name, direction and nearest landmark.</li>
            <li>3. Do not move seriously injured people unless there is fire or fuel risk.</li>
            <li>4. Control bleeding with firm pressure and keep the casualty warm and talking.</li>
            <li>5. Photograph the scene and vehicle registrations before anything is moved.</li>
            <li>6. Report the crash here so other road users know to avoid the stretch.</li>
          </ol>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 card-elevated">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <PhoneCall className="size-5 text-accent" /> Emergency numbers
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-3">
                <span className="text-sm">{c.name}</span>
                <span className="font-display text-lg font-bold">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <FeaturedProfileCard slot="campaigns_profile_of_week" />
        <FeaturedPageCard slot="campaigns_page_of_week" />
      </section>

      <section className="mt-14">
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
