import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Crossline Carpool" },
      {
        name: "description",
        content: "Sign in or create a Crossline account to book carpool seats or post rides across the GTA and BC.",
      },
      { property: "og:title", content: "Sign in — Crossline Carpool" },
      { property: "og:description", content: "Join Crossline to share intercity rides across Canada." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/rides" });
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
            data: { full_name: fullName, city },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Welcome to Crossline");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/rides" });
  }

  const field =
    "w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";

  return (
    <div className="mx-auto max-w-md px-5 sm:px-8 pt-14 pb-20">
      <p className="text-sm font-medium text-primary-deep">
        {mode === "signin" ? "Welcome back" : "Join the lane"}
      </p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">
        {mode === "signin" ? "Sign in to Crossline" : "Create your account"}
      </h1>

      <div className="mt-7 rounded-[22px] ring-1 ring-black/5 bg-card p-6">
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full name
                </label>
                <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Home city
                </label>
                <input
                  className={field}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mississauga, ON"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <input
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={google}
          className="w-full rounded-[12px] bg-background text-foreground text-sm font-medium py-3 ring-1 ring-line"
        >
          Continue with Google
        </button>

        <p className="mt-5 text-sm text-muted-foreground text-center">
          {mode === "signin" ? "New to Crossline?" : "Already have an account?"}{" "}
          <button
            className="text-primary-deep font-medium"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      <p className="mt-5 text-xs text-muted-foreground text-center">
        <Link to="/rides">Browse rides without signing in</Link>
      </p>
    </div>
  );
}
