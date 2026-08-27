import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  Share2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/partner-with-us")({
  head: () => ({
    meta: [
      { title: "Partner With Us: Share Barabara" },
      {
        name: "description",
        content:
          "Advertise to Share Barabara's community of Kenyan road users: banner ads, sponsored article features and social media collaborations, backed by Mjengo Networks and Mjengo Hub.",
      },
    ],
  }),
  component: PartnerPage,
});

const AUDIENCE = [
  {
    icon: Users,
    title: "An engaged, safety-minded audience",
    text: "Drivers, boda boda riders, matatu operators, pedestrians and fleet managers who come to Share Barabara specifically because they care about getting home safely. Coverage spans all 47 counties, with alerts and reports tied to specific roads, so your brand can show up where it matters to the people driving that route today.",
  },
  {
    icon: Newspaper,
    title: "Content people return to",
    text: "Live hazard alerts, verified crash reports, open statistics and road safety news give people a daily reason to check back, not a one-time visit.",
  },
  {
    icon: TrendingUp,
    title: "Built to grow",
    text: "As the community-sourced alert and reporting network expands county by county, so does the audience your brand reaches alongside it.",
  },
  {
    icon: ShieldCheck,
    title: "Backed by Mjengo Networks",
    text: "Share Barabara is part of Mjengo Networks, which connects people across Kenya's construction industry and runs Mjengo Hub, the country's (and East Africa's) number one construction news platform. Partnering with us can open the door to that wider audience too.",
  },
];

const FORMATS = [
  {
    icon: ImageIcon,
    title: "Banner placements",
    text: 'Rotating banner ads across news, alerts, reports, statistics and more, shown as GIFs with a clear "Visit advertiser" call to action.',
  },
  {
    icon: Newspaper,
    title: "Article features",
    text: "A sponsored or co-authored article in our newsroom, reaching readers who come back daily for road safety news.",
  },
  {
    icon: Share2,
    title: "Social media collaborations",
    text: "Joint posts, takeovers or campaign tie-ins across our social channels alongside our own content.",
  },
  {
    icon: Megaphone,
    title: "Campaign alignment",
    text: "Sponsor a Share Barabara campaign, such as the Share Barabara Walk or hospital visits to crash victims, and be associated with real road safety impact.",
  },
];

function PartnerPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ company: "", contact_email: "", goals: "", budget: "" });
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_enquiries").insert({
        ...form,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks, we will be in touch shortly");
      setSent(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Advertise with Share Barabara
      </p>
      <h1 className="mt-2 max-w-2xl text-[1.7325rem] font-extrabold leading-tight sm:text-[2.31rem]">
        Put your brand behind every journey home.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Share Barabara, part of Mjengo Networks Limited, is Kenya's community-driven road safety
        platform: live hazard alerts, verified crash reports and open statistics built by the people
        who use these roads every day. Partnering with us puts your brand in front of an audience
        that already trusts us to help them get home safely, and associates it with the niche
        authority we have built in road safety.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href="#enquiry">Start an enquiry</a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/campaigns">See our campaigns</Link>
        </Button>
      </div>

      <section className="mt-14">
        <h2 className="text-[1.155rem] font-bold">Why advertise with us</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {AUDIENCE.map((a) => (
            <div
              key={a.title}
              className="rounded-lg border border-border bg-card p-6 card-elevated"
            >
              <a.icon className="size-7 text-accent" />
              <h3 className="mt-3 font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[1.155rem] font-bold">Ad formats</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 card-elevated"
            >
              <f.icon className="size-7 text-accent" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-lg asphalt p-8 text-secondary">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-7 shrink-0 text-accent" />
          <div>
            <h2 className="text-[0.9625rem] font-bold text-background">
              Good companies of every kind
            </h2>
            <p className="mt-2 text-sm text-secondary/80">
              Most of our advertisers are naturally road-safety-adjacent: insurance providers,
              vehicle hire and dealership brands, transport and logistics operators, safety
              equipment and driving schools. But we don't lock good companies out just because their
              product isn't a road-safety one — we review every enquiry and welcome reputable brands
              from any industry who want to reach our audience.
            </p>
          </div>
        </div>
      </section>

      <section
        id="enquiry"
        className="mt-14 scroll-mt-24 rounded-lg border border-border bg-card p-6 card-elevated"
      >
        <h2 className="text-lg font-bold">Tell us about your campaign</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your company, what you would like to advertise, your goals and your budget. We will
          follow up to discuss placement, creative (banner GIFs) and pricing.
        </p>
        {sent ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-safe">
            <CheckCircle2 className="size-5" /> Enquiry received. An editor will follow up by email.
          </p>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-company">Company</Label>
                <Input
                  id="p-company"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-email">Contact email</Label>
                <Input
                  id="p-email"
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-budget">Budget (optional)</Label>
                <Input
                  id="p-budget"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="e.g. KES 50,000/month"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="p-goals">What are you advertising, and what is your goal?</Label>
              <Textarea
                id="p-goals"
                required
                rows={4}
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Sending…" : "Send enquiry"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
