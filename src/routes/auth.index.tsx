import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in: Share Barabara Kenya" },
      {
        name: "description",
        content:
          "Sign in or create an account to post road hazard alerts, file accident reports and comment on Kenyan road safety news.",
      },
      { property: "og:title", content: "Sign in: Share Barabara Kenya" },
      {
        property: "og:description",
        content:
          "Join the Kenyan road safety community: post alerts, report crashes, discuss news.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
    // On success the browser is redirected to Google, then back to redirectTo
    // once Supabase completes the exchange — nothing more to do here.
  }

  async function forgotPassword() {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
    toast.success("Check your email for a password reset link.");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
      <div>
        <span className="inline-flex items-center gap-2 rounded bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          <ShieldAlert className="size-4" /> Community access
        </span>
        <h1 className="mt-5 text-4xl font-extrabold">Your report can save a life</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Sign in to post hazard alerts, file accident reports and join the discussion. Reading the
          site is always free.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>• Post hazard alerts and file accident reports</li>
          <li>• Comment on news, alerts and reports</li>
          <li>• Subscribers can also write articles for review</li>
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 card-elevated">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Create account
          </button>
        </div>

        {sent ? (
          <p className="mt-6 rounded border border-safe/40 bg-safe/10 p-4 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account, then sign in.
          </p>
        ) : null}

        <Button variant="outline" className="mt-6 w-full" onClick={google}>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Wanjiru M."
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "signin" ? (
            resetSent ? (
              <p className="text-xs text-safe">Reset link sent, check your email.</p>
            ) : (
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs font-semibold text-brand-blue underline"
              >
                Forgot your password?
              </button>
            )
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-xs text-muted-foreground">
          By continuing you agree to keep reports factual. Emergencies always go to 999 or 112
          first.{" "}
          <Link to="/campaigns" hash="emergency" className="underline">
            Emergency numbers
          </Link>
        </p>
      </div>
    </div>
  );
}
