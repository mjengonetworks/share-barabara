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
  const [status, setStatus] = useState<"idle" | "subscribed" | "already">("idle");
  const [validationError, setValidationError] = useState("");

  const subscribe = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase(), user_id: user?.id ?? null });
      // A duplicate email means they're already subscribed — treat as success
      // rather than a real error.
      if (error?.code === "23505") return "already" as const;
      if (error) throw error;
      return "subscribed" as const;
    },
    onSuccess: (result) => {
      setStatus(result);
      toast.success(result === "already" ? "You're already subscribed" : "You're subscribed to the Share Barabara newsletter");
    },
    onError: () => toast.error("We couldn't subscribe you right now. Please try again."),
  });

  if (status === "subscribed") {
    return (
      <p className={`text-sm font-semibold ${className}`}>
        Thanks, you're on the list — watch your inbox for our next update.
      </p>
    );
  }

  if (status === "already") {
    return (
      <p className={`text-sm font-semibold ${className}`}>
        You're already subscribed — we'll keep you posted.
      </p>
    );
  }

  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
          setValidationError("Enter a valid email address.");
          return;
        }
        setValidationError("");
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
        aria-invalid={Boolean(validationError)}
      />
      <Button
        type="submit"
        disabled={subscribe.isPending}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Mail className="mr-1 size-4" />
        {subscribe.isPending ? "Subscribing…" : "Subscribe"}
      </Button>
      {validationError && <p className="basis-full text-xs text-destructive">{validationError}</p>}
    </form>
  );
}
