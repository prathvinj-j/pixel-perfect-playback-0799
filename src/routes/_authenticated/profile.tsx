import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { ArrowLeft, Check, Loader2, MapPin, Shield, ShoppingBag, Store, UserCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/site/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/auctions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & roles | Hammerline" },
      { name: "description", content: "Manage your member profile, buyer/seller roles, and account preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, isBuyer, isSeller, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");

  const [saving, setSaving] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 60) {
      toast.error("Display name must be between 1 and 60 characters.");
      return;
    }
    if (bio && bio.length > 500) {
      toast.error("Bio cannot exceed 500 characters.");
      return;
    }
    if (location && location.length > 80) {
      toast.error("Location cannot exceed 80 characters.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast.error(errorMessage(error));
    } else {
      await refreshProfile();
      toast.success("Profile updated");
    }
  };

  const addRole = async (role: "buyer" | "seller") => {
    setRoleUpdating(true);
    const { error } = await supabase.rpc("add_my_role", { p_role: role });
    setRoleUpdating(false);

    if (error) {
      toast.error(errorMessage(error));
    } else {
      await refreshProfile();
      toast.success(`${role === "buyer" ? "Buying" : "Selling"} enabled`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1.5 size-4" /> Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Profile & roles</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your public member identity and market capabilities.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left: Profile Form */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="size-16 sm:size-20 border-2 border-primary/20">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback className="bg-gradient-primary text-xl font-bold text-primary-foreground">
                {initials(displayName || profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{displayName || "Anonymous Member"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-1.5 mt-2">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="capitalize rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{displayName.length}/60 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Brooklyn, NY or London, UK"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar Image URL (optional)</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">About / Bio (optional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly describe your specialty, collection interests, or background..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/500 characters</p>
            </div>

            <Button type="submit" variant="hero" disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="animate-spin mr-2" />}
              Save Profile Changes
            </Button>
          </form>
        </div>

        {/* Right: Roles & Permissions */}
        <div className="space-y-6">
          <div className="rounded-3xl border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-base font-semibold border-b pb-3">
              <Shield className="size-5 text-primary" /> Marketplace Privileges
            </div>

            {/* Buyer role */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="flex items-start gap-2.5">
                <ShoppingBag className="size-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Buyer Privileges</div>
                  <div className="text-xs text-muted-foreground">Place bids and compete in auctions.</div>
                </div>
              </div>
              {isBuyer ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 rounded-full px-2 py-0.5">
                  <Check className="size-3" /> Active
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addRole("buyer")}
                  disabled={roleUpdating}
                >
                  Enable
                </Button>
              )}
            </div>

            {/* Seller role */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="flex items-start gap-2.5">
                <Store className="size-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Seller Privileges</div>
                  <div className="text-xs text-muted-foreground">Create listings and host auctions.</div>
                </div>
              </div>
              {isSeller ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 rounded-full px-2 py-0.5">
                  <Check className="size-3" /> Active
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => addRole("seller")}
                  disabled={roleUpdating}
                >
                  Enable
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Hammerline allows members to participate as both buyers and sellers simultaneously with a single account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
