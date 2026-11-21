import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/auctions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile & roles | Hammerline" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      location: location.trim() || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(errorMessage(error));
    else {
      await refreshProfile();
      toast.success("Profile updated");
    }
  };

  const addRole = async (role: "buyer" | "seller") => {
    const { error } = await supabase.rpc("add_my_role", { p_role: role });
    if (error) toast.error(errorMessage(error));
    else {
      await refreshProfile();
      toast.success(`${role === "buyer" ? "Buying" : "Selling"} enabled`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Profile & roles</h1>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div className="space-y-1.5"><Label htmlFor="displayName">Display name</Label><Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={1} maxLength={60} required /></div>
        <div className="space-y-1.5"><Label htmlFor="bio">Bio</Label><Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></div>
        <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} /></div>
        <Button type="submit" variant="hero" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save profile</Button>
      </form>
      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Marketplace roles</h2>
        <p className="mt-1 text-sm text-muted-foreground">Active roles: {roles.join(", ") || "none"}</p>
        <div className="mt-4 flex gap-2">
          {!roles.includes("buyer") && <Button variant="outline" onClick={() => addRole("buyer")}>Enable buying</Button>}
          {!roles.includes("seller") && <Button variant="outline" onClick={() => addRole("seller")}>Enable selling</Button>}
        </div>
      </div>
    </div>
  );
}
