import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { longDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter: Share Barabara Admin" }] }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: subscribers = [] } = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["admin-newsletter-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const activeCount = subscribers.filter((s) => s.active).length;

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("newsletter_broadcasts").insert({
        subject: subject.trim(),
        body: body.trim(),
        recipient_count: activeCount,
        sent_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        `Logged for ${activeCount} subscribers. Actual email delivery still needs an email provider wired up.`,
      );
      setSubject("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-broadcasts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Newsletter</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Composing here logs the broadcast for your records.{" "}
        <span className="font-semibold text-foreground">
          Actual email delivery isn't wired up yet
        </span>{" "}
        — that needs an email provider (e.g. Resend) connected as a Supabase secret and an edge
        function to send through it.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active subscribers", value: activeCount },
          { label: "Inactive", value: subscribers.length - activeCount },
          { label: "Total", value: subscribers.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-display text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 card-elevated">
          <h2 className="text-lg font-bold">Send newsletter</h2>
          <div>
            <Label htmlFor="n-subject">Subject line</Label>
            <Input
              id="n-subject"
              maxLength={100}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="n-body">Message</Label>
            <Textarea
              id="n-body"
              rows={10}
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Will be logged for {activeCount} active subscribers.
          </p>
          <Button
            disabled={subject.trim().length < 2 || body.trim().length < 2 || send.isPending}
            onClick={() => send.mutate()}
          >
            Send newsletter
          </Button>

          {broadcasts.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Past broadcasts
              </h3>
              <ul className="mt-3 space-y-2">
                {broadcasts.map((b) => (
                  <li key={b.id} className="rounded border border-border p-3 text-sm">
                    <p className="font-semibold">{b.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {longDate(b.created_at)} · {b.recipient_count} recipients
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Recent subscribers
          </h2>
          <ul className="mt-3 space-y-2">
            {subscribers.slice(0, 15).map((s) => (
              <li key={s.id} className="rounded border border-border bg-card p-3 text-sm">
                <p className="truncate font-medium">{s.email}</p>
                <p className="text-xs text-muted-foreground">{longDate(s.created_at)}</p>
              </li>
            ))}
            {subscribers.length === 0 ? (
              <li className="text-sm text-muted-foreground">No subscribers yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
