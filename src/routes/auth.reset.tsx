import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [{ title: "Reset Password: Share Barabara" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // The recovery link may have already been processed by the time this
    // component mounts, in which case a session already exists.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated, you're signed in.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <span className="inline-flex items-center gap-2 rounded bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        <KeyRound className="size-4" /> Reset password
      </span>
      <h1 className="mt-5 text-[1.44375rem] font-extrabold">Choose a new password</h1>

      {!ready ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Open this page from the password reset link we emailed you.{" "}
          <Link to="/auth" className="underline">
            Back to sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </form>
      )}
    </div>
  );
}
