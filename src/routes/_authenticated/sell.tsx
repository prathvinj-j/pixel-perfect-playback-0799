import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Calendar, DollarSign, ImagePlus, Loader2, Sparkles, Store, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { auctionKeys, errorMessage } from "@/lib/auctions";
import { CATEGORIES, CONDITIONS, type Category, type Condition, formatMoney } from "@/lib/auction-rules";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({
    meta: [
      { title: "Create listing | Hammerline" },
      { name: "description", content: "Create a time-bound auction with transparent real-time bidding on Hammerline." },
    ],
  }),
  component: SellPage,
});

const PRESET_DURATIONS = [
  { label: "1 Day", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "5 Days", hours: 120 },
  { label: "7 Days", hours: 168 },
];

const SAMPLE_IMAGES = [
  { label: "Vintage Camera", url: "/images/products/camera.jpg" },
  { label: "Dress Watch", url: "/images/products/watch.jpg" },
  { label: "Lounge Chair", url: "/images/products/lounge-chair.jpg" },
  { label: "Electric Guitar", url: "/images/products/guitar.jpg" },
  { label: "Leather Bag", url: "/images/products/handbag.jpg" },
  { label: "Mechanical Keyboard", url: "/images/products/keyboard.jpg" },
];

function SellPage() {
  const { user, isSeller, ready, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Role activation state
  const [activatingSeller, setActivatingSeller] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Electronics");
  const [condition, setCondition] = useState<Condition>("excellent");
  const [images, setImages] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("100");
  const [minIncrement, setMinIncrement] = useState("5");

  // Timing
  const [startType, setStartType] = useState<"now" | "later">("now");
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationHours, setDurationHours] = useState(72); // 3 days default
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const enableSellerRole = async () => {
    setActivatingSeller(true);
    const { error } = await supabase.rpc("add_my_role", { p_role: "seller" });
    setActivatingSeller(false);
    if (error) {
      toast.error("Failed to activate seller role", { description: errorMessage(error) });
    } else {
      await refreshProfile();
      toast.success("Seller account activated!", {
        description: "You can now list items and host live auctions on Hammerline.",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    if (images.length >= 6) {
      toast.error("Maximum 6 images allowed per auction.");
      return;
    }

    setUploadingImage(true);
    try {
      const file = files[0]!;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast.error("Storage upload note", {
          description: "Using local image preview or preset since storage bucket may be in setup.",
        });
        const localUrl = URL.createObjectURL(file);
        setImages((prev) => [...prev, localUrl].slice(0, 6));
      } else {
        const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(data.path);
        setImages((prev) => [...prev, publicUrl.publicUrl].slice(0, 6));
        toast.success("Image uploaded successfully.");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const addImageUrl = () => {
    if (!customImageUrl.trim()) return;
    if (images.length >= 6) {
      toast.error("Maximum 6 images allowed per auction.");
      return;
    }
    setImages((prev) => [...prev, customImageUrl.trim()].slice(0, 6));
    setCustomImageUrl("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const priceNum = Number(startingPrice);
    const incNum = Number(minIncrement);

    if (trimmedName.length < 3) {
      toast.error("Product name must be at least 3 characters.");
      return;
    }
    if (trimmedDesc.length < 10) {
      toast.error("Description must be at least 10 characters.");
      return;
    }
    if (!priceNum || priceNum <= 0) {
      toast.error("Starting price must be greater than $0.");
      return;
    }
    if (!incNum || incNum <= 0) {
      toast.error("Minimum increment must be greater than $0.");
      return;
    }

    const now = new Date();
    const startTime = startType === "now" ? now : new Date(scheduledStart);
    if (startType === "later" && (!scheduledStart || startTime.getTime() <= now.getTime())) {
      toast.error("Scheduled start time must be in the future.");
      return;
    }

    const endTime = new Date(startTime.getTime() + durationHours * 3600_000);
    const finalImages = images.length > 0 ? images : ["/images/products/camera.jpg"];

    setSubmitting(true);
    const { data: auctionId, error } = await supabase.rpc("create_listing", {
      p_name: trimmedName,
      p_description: trimmedDesc,
      p_category: category,
      p_condition: condition,
      p_image_urls: finalImages,
      p_starting_price: priceNum,
      p_min_increment: incNum,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
    });

    setSubmitting(false);

    if (error) {
      toast.error(errorMessage(error));
    } else {
      toast.success("Listing created", {
        description: `"${trimmedName}" is now live on Hammerline.`,
      });
      qc.invalidateQueries({ queryKey: auctionKeys.all });
      qc.invalidateQueries({ queryKey: auctionKeys.seller(user.id) });
      navigate({ to: "/auctions/$id", params: { id: auctionId as string } });
    }
  };

  if (!isSeller) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border bg-card p-8 text-center shadow-card sm:p-12">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">Start Selling on Hammerline</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Create transparent, time-bound auctions for vintage goods, design, and collectibles. Watch bids come in live and get guaranteed highest-bidder clearance.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="hero"
              onClick={enableSellerRole}
              disabled={activatingSeller}
              className="px-8"
            >
              {activatingSeller && <Loader2 className="animate-spin" />}
              Activate Seller Account
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auctions">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1.5 size-4" /> Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Create an auction</h1>
        <p className="mt-1 text-muted-foreground">
          Set up your item and auction parameters. Your auction will be published transparently to all buyers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Item Details */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">1. Item Information</h2>

          <div className="space-y-2">
            <Label htmlFor="title">
              Item Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 1974 Vintage Rangefinder 35mm Camera"
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{name.length}/120 characters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">
              Item Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe provenance, condition, included accessories, flaws, and dimensions..."
              rows={4}
              maxLength={4000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/4000 characters</p>
          </div>
        </div>

        {/* Section 2: Photos */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-semibold">2. Product Photos</h2>
            <span className="text-xs text-muted-foreground">{images.length}/6 photos added</span>
          </div>

          {/* Image upload area */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-2">
                Upload from device
              </Label>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/30 cursor-pointer transition p-4 text-center"
              >
                {uploadingImage ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="size-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-medium">Click to upload photo</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG or WebP up to 10MB</span>
                  </>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage || images.length >= 6}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Add by Image URL</Label>
              <div className="flex gap-2">
                <Input
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="h-10 text-sm"
                  disabled={images.length >= 6}
                />
                <Button type="button" variant="outline" onClick={addImageUrl} disabled={!customImageUrl.trim() || images.length >= 6}>
                  <ImagePlus className="size-4" />
                </Button>
              </div>
              <div className="mt-3">
                <span className="text-xs text-muted-foreground block mb-1.5">Or pick demo sample image:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_IMAGES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        if (images.length < 6 && !images.includes(s.url)) {
                          setImages((prev) => [...prev, s.url]);
                        }
                      }}
                      className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-primary/20 transition"
                    >
                      +{s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Photo Preview Strip */}
          {images.length > 0 && (
            <div className="pt-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Attached Photos (first image is cover)
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border bg-muted">
                    <img src={img} alt="" className="size-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 size-6 rounded-full bg-destructive text-destructive-foreground grid place-items-center opacity-80 hover:opacity-100 transition shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Pricing & Timing */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">3. Auction Pricing & Duration</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starting-price">
                Starting Price ($ USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input
                  id="starting-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="pl-8 text-lg font-semibold tabular"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">The initial minimum offer required to start bidding.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-increment">
                Minimum Bid Increment ($ USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input
                  id="min-increment"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  className="pl-8 text-lg font-semibold tabular"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Each new bid must exceed the prior high bid by at least this amount.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label>Auction Start</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={startType === "now" ? "hero" : "outline"}
                size="sm"
                onClick={() => setStartType("now")}
              >
                <Sparkles className="size-3.5" /> Start Immediately
              </Button>
              <Button
                type="button"
                variant={startType === "later" ? "hero" : "outline"}
                size="sm"
                onClick={() => setStartType("later")}
              >
                <Calendar className="size-3.5" /> Schedule for Later
              </Button>
            </div>
            {startType === "later" && (
              <div className="mt-3 max-w-xs">
                <Label htmlFor="sched" className="text-xs text-muted-foreground">
                  Select start date & time
                </Label>
                <Input
                  id="sched"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label>Auction Duration</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_DURATIONS.map((dur) => (
                <button
                  key={dur.hours}
                  type="button"
                  onClick={() => setDurationHours(dur.hours)}
                  className={`rounded-xl border p-3 text-center transition font-medium text-sm ${
                    durationHours === dur.hours
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between rounded-2xl bg-stage text-navy-foreground p-6 shadow-elevated">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-navy-muted">Starting Auction At</div>
            <div className="text-2xl font-bold text-gradient-primary">
              {formatMoney(Number(startingPrice) || 0)}
            </div>
          </div>
          <Button type="submit" variant="hero" size="xl" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin mr-2" />}
            Create listing
          </Button>
        </div>
      </form>
    </div>
  );
}
