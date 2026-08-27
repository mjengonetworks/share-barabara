import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/quote")({
  head: () => ({ meta: [{ title: "Quote of the Day: Share Barabara Admin" }] }),
  component: QuotePage,
});

function QuotePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ quote: "", author: "" });

  const { data: current } = useQuery({
    queryKey: ["site-quote"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_quote")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (current) setForm({ quote: current.quote, author: current.author ?? "" });
  }, [current]);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["quote-submissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(
    submissions.map((s) => s.user_id).filter((id): id is string => !!id),
  );

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_quote")
        .update({
          quote: form.quote,
          author: form.author.trim() || null,
          updated_by: user?.id ?? null,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quote of the day updated");
      queryClient.invalidateQueries({ queryKey: ["site-quote"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({
      id,
      approve,
      quote,
      author,
    }: {
      id: string;
      approve: boolean;
      quote: string;
      author: string | null;
    }) => {
      const { error: e1 } = await supabase
        .from("quote_submissions")
        .update({ status: approve ? "approved" : "rejected" })
        .eq("id", id);
      if (e1) throw e1;
      if (approve) {
        const { error: e2 } = await supabase
          .from("site_quote")
          .update({ quote, author, updated_by: user?.id ?? null })
          .eq("id", 1);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Submission processed");
      queryClient.invalidateQueries({ queryKey: ["quote-submissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-quote"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Quote of the day</h1>
      <p className="mt-2 text-muted-foreground">
        Shown site-wide until it's changed again — it's on you to refresh it.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5 card-elevated">
        <div>
          <Label htmlFor="q">Quote</Label>
          <Textarea
            id="q"
            rows={3}
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="qa">Attribution</Label>
          <Input
            id="qa"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </div>
        <Button
          disabled={form.quote.trim().length < 3 || save.isPending}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
      </div>

      <h2 className="mt-10 text-[0.9625rem] font-bold">Submitted quotes</h2>
      {isLoading ? <p className="mt-4 text-muted-foreground">Loading…</p> : null}
      {!isLoading && submissions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No pending submissions.</p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {submissions.map((s) => (
          <li key={s.id} className="rounded-lg border border-border bg-card p-4">
            <p className="italic">"{s.quote}"</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.author}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {s.user_id ? <UserLink userId={s.user_id} name={names[s.user_id]} /> : "Anonymous"} ·{" "}
              {timeAgo(s.created_at)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: s.id, approve: true, quote: s.quote, author: s.author })
                }
              >
                Approve &amp; set as today's quote
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: s.id, approve: false, quote: s.quote, author: s.author })
                }
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
