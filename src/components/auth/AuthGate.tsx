import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/**
 * Member, policy and escalation data is only served to signed-in claims staff.
 * Anonymous visitors get a sign-in form instead of any customer data.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSupabaseSession();

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </main>
    );
  }

  if (!session) return <SignInPanel />;

  return <>{children}</>;
}

function SignInPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm the account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-panel">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden />
          <span className="label-caps">Staff access</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl text-foreground">
          {mode === "signin" ? "Sign in to continue" : "Create a staff account"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Member records, policies and escalations are only available to signed-in claims staff.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="email" className="label-caps text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="label-caps text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-accent"
            />
          </div>

          {notice && <p className="text-[12.5px] text-muted-foreground">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-[12.5px] text-muted-foreground underline-offset-2 hover:underline"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
