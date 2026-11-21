import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CONDITIONS, type Condition } from "@/lib/auction-rules";
import { errorMessage } from "@/lib/auctions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "Create listing | Hammerline" }] }),
  component: SellPage,
});

function SellPage() {
  const navigate = useNavigate();
  const { isSeller, ready } = useAuth();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Collectibles");
  const [condition, setCondition] = useState<Condition>("excellent");
  const [startingPrice, setStartingPrice] = useState("100");
  const [increment, setIncrement] = useState("5");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (ready && !isSeller) navigate({ to: "/profile", replace: true });
  }, [ready, isSeller, navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("create_listing", {
      p_name: name.trim(),
      p_description: description.trim(),
      p_category: category,
      p_condition: condition,
      p_image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
      p_starting_price: Number(startingPrice),
      p_min_increment: Number(increment),
      p_start_time: new Date(startTime).toISOString(),
      p_end_time: new Date(endTime).toISOString(),
    });
    setBusy(false);
    if (error) toast.error(errorMessage(error));
    else {
      toast.success("Listing created");
      navigate({ to: "/auctions/$id", params: { id: data as string } });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Create an auction</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border bg-card p-6 shadow-card">
        <div className="space-y-1.5"><Label htmlFor="name">Item name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={120} required /></div>
        <div className="space-y-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={4000} required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Category</Label><Select value={category} onValueChange={(v) => setCategory(v as typeof category)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Condition</Label><Select value={condition} onValueChange={(v) => setCondition(v as Condition)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="starting">Starting price</Label><Input id="starting" type="number" min="0.01" step="0.01" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="increment">Minimum increment</Label><Input id="increment" type="number" min="0.01" step="0.01" value={increment} onChange={(e) => setIncrement(e.target.value)} required /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="start">Starts</Label><Input id="start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="end">Ends</Label><Input id="end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="image">Image URL</Label><Input id="image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></div>
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create listing</Button>
      </form>
    </div>
  );
}
