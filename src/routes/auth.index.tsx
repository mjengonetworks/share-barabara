import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeInternalReturnTo } from "@/lib/ai/return-to-ai";

const PENDING_REFERRAL_KEY = "sb_pending_referral";

export const Route = createFileRoute("/auth/")({
  validateSearch: (search: Record<string, unknown>): { ref?: string; returnTo?: string } => {
    const ref = typeof search["ref"] === "string" ? (search["ref"] as string) : undefined;
    const returnTo = safeInternalReturnTo(search["returnTo"]);
    return { ...(ref ? { ref } : {}), ...(returnTo ? { returnTo } : {}) };
  },
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
  const { ref, returnTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Stashed client-side so it survives a Google OAuth round trip, then
  // applied (or manually entered later on Settings) once we have a session.
  useEffect(() => {
    if (ref) localStorage.setItem(PENDING_REFERRAL_KEY, ref);
  }, [ref]);

  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (pending) {
      localStorage.removeItem(PENDING_REFERRAL_KEY);
      void supabase.rpc("apply_referral_code", { _code: pending }).then();
    }
    if (returnTo) window.location.assign(returnTo);
    else navigate({ to: "/dashboard", replace: true });
  }, [user, navigate, returnTo]);

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
    const callback = new URL("/auth", window.location.origin);
    callback.searchParams.set("returnTo", safeInternalReturnTo(returnTo) ?? "/dashboard");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
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
        <h1 className="mt-5 text-[1.7325rem] font-extrabold">Your report can save a life</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Sign in to post hazard alerts, file accident reports, write articles and join the
          discussion. Reading the site is always free.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>• Post hazard alerts and file accident reports</li>
          <li>• Write articles for Share Barabara</li>
          <li>• Comment on news, alerts and reports</li>
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
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 size-5" role="img">
            <path fill="#4285F4" d="M21.6 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.56Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.88V7.53H3.05A10 10 0 0 0 2 12c0 1.61.39 3.13 1.05 4.47l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.95 5.53l3.34 2.59C7.18 7.75 9.39 5.99 12 5.99Z" />
          </svg>
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
