import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function NewsletterForm({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [done, setDone] = useState(false);

  const subscribe = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase(), user_id: user?.id ?? null });
      // A duplicate email means they're already subscribed — treat as success
      // rather than a real error.
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      setDone(true);
      toast.success("You're subscribed to the Share Barabara newsletter");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <p className={`text-sm font-semibold ${className}`}>
        Thanks, you're on the list — watch your inbox for our next update.
      </p>
    );
  }

  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        subscribe.mutate();
      }}
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="max-w-xs bg-background"
      />
      <Button type="submit" disabled={subscribe.isPending}>
        <Mail className="mr-1 size-4" />
        {subscribe.isPending ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  );
}
