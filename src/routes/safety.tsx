import { createFileRoute } from "@tanstack/react-router";
import { Bike, CircleGauge, FootprintsIcon, PhoneCall, ShieldCheck } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/constants";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Road Safety Guidance & Emergency Numbers in Kenya: Share Barabara" },
      {
        name: "description",
        content:
          "Practical road safety guidance for Kenyan drivers, boda boda riders, passengers and pedestrians, plus emergency numbers and crash scene steps.",
      },
      { property: "og:title", content: "Road Safety Guidance & Emergency Numbers in Kenya" },
      {
        property: "og:description",
        content: "What to do at a crash scene, key rules, and who to call in an emergency in Kenya.",
      },
    ],
  }),
  component: SafetyPage,
});

const GUIDES = [
  {
    icon: CircleGauge,
    title: "Drivers",
    points: [
      "Keep to 50km/h in built-up areas and 30km/h near schools and markets.",
      "Never overtake on a blind bend, bridge or hill crest.",
      "Zero alcohol before driving: the legal limit is low and enforcement is active at night.",
      "Rest every two hours on long trips; fatigue is a leading cause of highway crashes.",
    ],
  },
  {
    icon: Bike,
    title: "Boda boda riders",
    points: [
      "Wear a KEBS-certified helmet and make sure your passenger wears one too.",
      "Carry one pillion passenger only, and use a reflective jacket at all times.",
      "Stay off the fast lane and never ride against traffic.",
      "Use headlights from dusk and keep to lit routes at night.",
    ],
  },
  {
    icon: FootprintsIcon,
    title: "Pedestrians",
    points: [
      "Use footbridges and zebra crossings even when they cost you a few extra minutes.",
      "Wear something light or reflective when walking at night.",
      "Look right, left and right again, and never step out from behind a parked matatu.",
      "Keep children on the inside of the pavement, holding your hand.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Passengers",
    points: [
      "Belt up in every seat, including the back of a matatu.",
      "Speak up early if a driver is speeding, on the phone or overlapping.",
      "Note the vehicle registration and report dangerous PSVs to the NTSA hotline.",
      "Avoid boarding vehicles with bald tyres, cracked windscreens or no speed limiter.",
    ],
  },
];

function SafetyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Guidance
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Stay safe on Kenyan roads</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Simple habits prevent most crashes. Here is what matters most for each kind
        of road user, and what to do when things go wrong.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {GUIDES.map((g) => (
          <section key={g.title} className="rounded-lg border border-border bg-card p-6 card-elevated">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded bg-accent/20 text-accent-foreground">
                <g.icon className="size-5" />
              </span>
              <h2 className="text-xl font-bold">{g.title}</h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-foreground/90">
              {g.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-accent">▸</span>
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
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
    </div>
  );
}