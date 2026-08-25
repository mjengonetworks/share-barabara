import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, TrendingUp, Users } from "lucide-react";
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
        content: "Advertise your road-safety-related business or service to Share Barabara's community of Kenyan road users.",
      },
    ],
  }),
  component: PartnerPage,
});

const REASONS = [
  { icon: Users, text: "A road-safety-focused audience: drivers, riders, pedestrians and fleet operators." },
  { icon: TrendingUp, text: "Growing readership across news, alerts, reports and statistics." },
  { icon: ShieldCheck, text: "Every ad is reviewed to relate to road safety, so your brand keeps good company." },
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Advertise</p>
      <h1 className="mt-2 text-4xl font-extrabold">Partner with Share Barabara</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Reach Kenyan drivers, riders and pedestrians directly. Adverts must relate to road safety in
        some way: insurance, vehicle hire, long-distance transport, safety equipment and similar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.text} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <r.icon className="size-6 text-accent" />
            <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="text-lg font-bold">Tell us about your campaign</h2>
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
      </div>
    </div>
  );
}
