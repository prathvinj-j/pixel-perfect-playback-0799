import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/auctions";
import { cn } from "@/lib/utils";

interface AuthSearch { mode?: "signin" | "signup"; redirect?: string }

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => {
    const out: AuthSearch = {};
    if (s["mode"] === "signin" || s["mode"] === "signup") out.mode = s["mode"];
    if (typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//")) out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in or join | Hammerline" },
      { name: "description", content: "Create a buyer or seller account to bid and list items on Hammerline." },
      { property: "og:title", content: "Join Hammerline" },
      { property: "og:description", content: "Create a buyer or seller account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const DEMO = [
  { label: "Demo buyer", email: "buyer@hammerline.demo" },
  { label: "Demo buyer 2", email: "buyer2@hammerline.demo" },
  { label: "Demo seller", email: "seller@hammerline.demo" },
];

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = search.redirect ?? "/dashboard";

  useEffect(() => {
    if (user) navigate({ to: dest as "/dashboard", replace: true });
  }, [user, dest, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      if (name.trim().length < 2) { toast.error("Enter your name"); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim(), role } },
      });
      if (error) toast.error(errorMessage(error));
      else if (!data.session) toast.success("Check your email to confirm your account.");
      else toast.success("Welcome to Hammerline!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(errorMessage(error));
    }
    setBusy(false);
  };

  const oauth = async (provider: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error(errorMessage(r.error));
  };

  return (
    <div className="bg-stage">
      <div className="mx-auto flex max-w-md flex-col px-4 py-14">
        <div className="rounded-3xl border bg-card p-6 shadow-elevated sm:p-8">
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to bid and track your auctions." : "Choose how you'll use Hammerline. You can add the other role later."}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {([["buyer", "I want to buy", ShoppingBag], ["seller", "I want to sell", Store]] as const).map(([v, l, Icon]) => (
                    <button type="button" key={v} onClick={() => setRole(v)} className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition", role === v ? "border-primary bg-accent text-accent-foreground" : "border-border hover:border-primary/40")}>
                      <Icon className="size-5" />{l}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></div>
              </>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
            <Button variant="outline" onClick={() => oauth("lovable")}>Continue with Lovable</Button>
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here? " : "Already a member? "}
            <button className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create an account" : "Sign in"}</button>
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-navy-border bg-navy-elevated/80 p-4 text-sm text-navy-muted">
          <div className="font-semibold text-navy-foreground">Demo accounts</div>
          <p className="mt-1">Password for all: <span className="tabular text-navy-foreground">HammerDemo!2026</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO.map((d) => <Button key={d.email} variant="stage" size="sm" onClick={() => { setMode("signin"); setEmail(d.email); setPassword("HammerDemo!2026"); }}>{d.label}</Button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
