import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QuoteOfTheDay() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ quote: "", author: "" });

  const { data: quote } = useQuery({
    queryKey: ["site-quote"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_quote").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to submit a quote");
      const { error } = await supabase.from("quote_submissions").insert({ ...form, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks, editors will review your quote");
      setSent(true);
      setForm({ quote: "", author: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6 card-elevated">
      <div className="flex items-start gap-3">
        <Quote className="size-8 shrink-0 text-accent" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Road safety quote of the day
          </p>
          <p className="mt-2 text-lg font-semibold italic">
            {quote?.quote ?? "Every journey home should end at home."}
          </p>
          {quote?.author ? <p className="mt-1 text-sm text-muted-foreground">{quote.author}</p> : null}
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSent(false);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4">
            Suggest a quote
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest a quote of the day</DialogTitle>
          </DialogHeader>
          {!user ? (
            <p className="text-sm text-muted-foreground">Sign in to suggest a quote.</p>
          ) : sent ? (
            <p className="text-sm text-safe">Thanks. Editors have been notified.</p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <div>
                <Label htmlFor="q-text">Quote</Label>
                <Textarea
                  id="q-text"
                  required
                  rows={3}
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="q-author">Attribution (optional)</Label>
                <Input
                  id="q-author"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Sending…" : "Submit for review"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
