import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Crown, Gavel, Loader2, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageGallery } from "@/components/auction/ImageGallery";
import { BidHistory } from "@/components/auction/BidHistory";
import { StatusBadge } from "@/components/auction/StatusBadge";
import { CountdownBlocks } from "@/components/auction/Countdown";
import { EmptyState } from "@/components/site/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { auctionKeys, auctionQuery, bidsQuery, errorMessage, syncAuctionLifecycle, type AuctionWithProduct } from "@/lib/auctions";
import { conditionLabel, effectiveStatus, formatMoney, minNextBid, validateBidAmount } from "@/lib/auction-rules";
import { useNow } from "@/hooks/use-now";
import { useAuctionRealtime } from "@/hooks/use-auction-realtime";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auctions/$id")({
  head: () => ({
    meta: [
      { title: "Auction details | Hammerline" },
      { name: "description", content: "Live auction: current high bid, minimum next bid, countdown and full bid history." },
      { property: "og:title", content: "Live auction on Hammerline" },
      { property: "og:description", content: "See the current high bid and place yours before the clock runs out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuctionDetail,
});

function AuctionDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: auction, isLoading } = useQuery(auctionQuery(id));
  const bidsQ = useQuery(bidsQuery(id));
  const now = useNow() || Date.now();
  useAuctionRealtime(id);

  const sync = useCallback(async () => {
    await syncAuctionLifecycle();
    qc.invalidateQueries({ queryKey: auctionKeys.detail(id) });
    qc.invalidateQueries({ queryKey: auctionKeys.bids(id) });
  }, [qc, id]);

  const status = auction ? effectiveStatus(auction, now) : null;
  useEffect(() => {
    if (auction && status === "completed" && auction.status !== "completed") void sync();
  }, [auction, status, sync]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <Skeleton className="aspect-[5/4] rounded-3xl" />
        <Skeleton className="h-[480px] rounded-3xl" />
      </div>
    );
  }
  if (!auction || !status) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState icon={Gavel} title="Auction not found" description="It may have been removed." action={<Button asChild><Link to="/auctions">Back to marketplace</Link></Button>} />
      </div>
    );
  }
  const p = auction.product;
  const closed = status === "completed";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/auctions"><ArrowLeft /> Marketplace</Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 space-y-6">
          <ImageGallery images={p.image_urls} alt={p.name} />
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{p.category}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">Condition: {conditionLabel(p.condition)}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{p.name}</h1>
            <p className="mt-4 whitespace-pre-line text-muted-foreground">{p.description}</p>
            <dl className="mt-6 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Starts</dt><dd className="font-medium">{format(new Date(auction.start_time), "PPp")}</dd></div>
              <div><dt className="text-muted-foreground">Ends</dt><dd className="font-medium">{format(new Date(auction.end_time), "PPp")}</dd></div>
              <div><dt className="text-muted-foreground">Starting price</dt><dd className="tabular font-medium">{formatMoney(auction.starting_price)}</dd></div>
              <div><dt className="text-muted-foreground">Minimum increment</dt><dd className="tabular font-medium">{formatMoney(auction.min_increment)}</dd></div>
            </dl>
          </div>
          {auction.seller && (
            <div className="rounded-3xl border bg-card p-6 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Seller</div>
              <div className="mt-2 font-display text-lg font-semibold">{auction.seller.display_name}</div>
              {auction.seller.location && <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{auction.seller.location}</div>}
              {auction.seller.bio && <p className="mt-2 text-sm text-muted-foreground">{auction.seller.bio}</p>}
            </div>
          )}
        </div>
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <BidPanel auction={auction} status={status} onElapsed={sync} />
          <BidHistory bids={bidsQ.data ?? []} loading={bidsQ.isLoading} myId={user?.id} closed={closed} />
        </div>
      </div>
    </div>
  );
}

function BidPanel({ auction, status, onElapsed }: { auction: AuctionWithProduct; status: ReturnType<typeof effectiveStatus>; onElapsed: () => void }) {
  const { user, isBuyer, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const min = minNextBid(auction);
  const [amount, setAmount] = useState(String(min));
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAmount((prev) => (Number(prev) < min ? String(min) : prev));
  }, [min]);

  const closed = status === "completed";
  const urgent = status === "ending_soon";
  const isSellerOwn = user?.id === auction.seller_id;
  const leading = !!user && auction.highest_bidder_id === user.id;

  const review = () => {
    const v = Number(amount);
    const err = validateBidAmount(v, auction);
    setError(err);
    if (!err) setConfirm(true);
  };

  const submit = async () => {
    setBusy(true);
    const { error: e } = await supabase.rpc("place_bid", { p_auction_id: auction.id, p_amount: Number(amount) });
    setBusy(false);
    setConfirm(false);
    if (e) {
      setError(errorMessage(e));
      toast.error("Bid rejected", { description: errorMessage(e) });
    } else {
      setError(null);
      toast.success("Bid placed", { description: `You're the highest bidder at ${formatMoney(Number(amount))}.` });
    }
    qc.invalidateQueries({ queryKey: auctionKeys.detail(auction.id) });
    qc.invalidateQueries({ queryKey: auctionKeys.bids(auction.id) });
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-stage p-6 text-navy-foreground shadow-elevated">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-navy-muted">
          {closed ? "Final result" : auction.current_bid != null ? "Current highest bid" : "Starting price"}
        </span>
        <span className="text-xs text-navy-muted">{auction.bid_count} bid{auction.bid_count === 1 ? "" : "s"}</span>
      </div>
      <div key={String(auction.current_bid)} className="tabular mt-1 animate-bid-flash rounded-lg text-4xl font-bold sm:text-5xl">
        {closed && auction.current_bid == null ? "No bids" : formatMoney(auction.current_bid ?? auction.starting_price)}
      </div>
      {auction.highest_bidder && !closed && (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-navy-muted"><Crown className="size-3.5" /> {leading ? "You" : auction.highest_bidder.display_name}</div>
      )}

      {!closed && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-navy-muted">
            {status === "upcoming" ? "Bidding opens in" : urgent ? "Ending soon — time left" : "Time left"}
          </div>
          <CountdownBlocks to={status === "upcoming" ? auction.start_time : auction.end_time} urgent={urgent} onElapsed={onElapsed} />
        </div>
      )}

      <div className="mt-6">
        {closed ? (
          <div className="rounded-2xl border border-navy-border bg-navy-elevated p-5">
            {auction.status !== "completed" ? (
              <div className="flex items-center gap-2 text-navy-muted"><Loader2 className="size-4 animate-spin" /> Finalizing results…</div>
            ) : auction.winner ? (
              <div className="flex items-center gap-3">
                <Trophy className="size-8 text-warning" />
                <div>
                  <div className="font-semibold">{auction.winner_id === user?.id ? "You won this auction!" : `Won by ${auction.winner.display_name}`}</div>
                  <div className="text-sm text-navy-muted">Final price {formatMoney(auction.final_price)}</div>
                </div>
              </div>
            ) : (
              <div><div className="font-semibold">Closed with no bids</div><div className="text-sm text-navy-muted">No winner for this auction.</div></div>
            )}
          </div>
        ) : status === "upcoming" ? (
          <div className="flex items-center gap-2 rounded-2xl border border-navy-border bg-navy-elevated p-4 text-sm text-navy-muted"><CalendarClock className="size-4" /> Bids open at {format(new Date(auction.start_time), "PPp")}. Minimum first bid {formatMoney(min)}.</div>
        ) : !user ? (
          <Button asChild variant="hero" size="xl" className="w-full"><Link to="/auth" search={{ mode: "signin" }}>Sign in to bid</Link></Button>
        ) : isSellerOwn ? (
          <div className="rounded-2xl border border-navy-border bg-navy-elevated p-4 text-sm text-navy-muted">This is your listing. You can watch bids arrive live but can't bid on it.</div>
        ) : !isBuyer ? (
          <Button variant="hero" size="xl" className="w-full" onClick={async () => { const { error: e } = await supabase.rpc("add_my_role", { p_role: "buyer" }); if (e) toast.error(errorMessage(e)); else { await refreshProfile(); toast.success("Bidding enabled on your account"); } }}>
            Enable bidding on my account
          </Button>
        ) : (
          <div>
            {leading && <div className="mb-3 rounded-xl bg-success/20 px-3 py-2 text-sm font-medium text-success-foreground">You're the highest bidder.</div>}
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-navy-muted">Minimum next bid</span>
              <span className="tabular font-semibold">{formatMoney(min)}</span>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[min, min + Number(auction.min_increment), min + Number(auction.min_increment) * 3].map((v) => (
                <Button key={v} variant="stage" size="sm" onClick={() => { setAmount(String(v)); setError(null); }}>{formatMoney(v, true)}</Button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); review(); }}>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" inputMode="decimal" step="0.01" min={min} value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} className="tabular h-12 rounded-xl border-0 bg-card pl-7 text-lg text-foreground" aria-label="Bid amount" />
              </div>
              <Button type="submit" variant="hero" size="xl" disabled={busy || leading}><Gavel /> Bid</Button>
            </form>
            {error && <p className="mt-2 text-sm font-medium text-live" role="alert">{error}</p>}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-navy-muted"><ShieldCheck className="size-3.5" /> Every bid is verified on the server against the live high bid and deadline.</p>
          </div>
        )}
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your bid</AlertDialogTitle>
            <AlertDialogDescription>
              Place a binding bid of <strong>{formatMoney(Number(amount))}</strong> on "{auction.product.name}"? If someone bids higher first, your bid will be rejected and you can try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void submit(); }} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Place bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
