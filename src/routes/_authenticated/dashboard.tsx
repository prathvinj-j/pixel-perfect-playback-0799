import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, Crown, Gavel, LayoutDashboard, PlusCircle, ShoppingBag, Store, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/site/EmptyState";
import { Countdown } from "@/components/auction/Countdown";
import { StatusBadge } from "@/components/auction/StatusBadge";
import { myBidsQuery, sellerAuctionsQuery, type MyParticipation, type AuctionWithProduct } from "@/lib/auctions";
import { effectiveStatus, formatMoney } from "@/lib/auction-rules";
import { useAuth } from "@/lib/auth";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Hammerline" },
      { name: "description", content: "Manage your active bids, monitor lots you are leading, and view your seller listings." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, isBuyer, isSeller } = useAuth();
  const uid = user?.id ?? "";
  const now = useNow() || Date.now();

  const [activeTab, setActiveTab] = useState<"bids" | "sales">("bids");

  const myBidsQ = useQuery({ ...myBidsQuery(uid), enabled: !!uid && isBuyer });
  const sellerQ = useQuery({ ...sellerAuctionsQuery(uid), enabled: !!uid && isSeller });

  const participations = myBidsQ.data ?? [];
  const sellerListings = sellerQ.data ?? [];

  // Buyer metrics
  const activeBids = participations.filter((p) => {
    const s = effectiveStatus(p.auction, now);
    return s === "active" || s === "ending_soon";
  });
  const leadingCount = activeBids.filter((p) => p.auction.highest_bidder_id === uid).length;
  const outbidCount = activeBids.filter((p) => p.auction.highest_bidder_id !== uid).length;
  const wonCount = participations.filter((p) => p.auction.status === "completed" && p.auction.winner_id === uid).length;

  // Seller metrics
  const activeSellerListings = sellerListings.filter((a) => {
    const s = effectiveStatus(a, now);
    return s === "active" || s === "ending_soon";
  });
  const totalBidsReceived = sellerListings.reduce((sum, a) => sum + a.bid_count, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Account</span>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Welcome back, {profile?.display_name ?? "Member"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your bids and listings, synced live with Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSeller && (
            <Button asChild variant="hero">
              <Link to="/sell">
                <PlusCircle className="mr-1.5 size-4" /> New listing
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/auctions" search={{ tab: "active", sort: "ending" }}>
              Browse Floor
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="text-xs font-medium uppercase text-muted-foreground">Active Bids</div>
          <div className="mt-2 text-2xl font-bold sm:text-3xl tabular">{activeBids.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">in live auctions</div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card border-success/30 bg-success/5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-success">
            <Crown className="size-3.5" /> Currently Leading
          </div>
          <div className="mt-2 text-2xl font-bold text-success sm:text-3xl tabular">{leadingCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">top offer standing</div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-destructive">
            <AlertCircle className="size-3.5" /> Outbid Lots
          </div>
          <div className="mt-2 text-2xl font-bold text-destructive sm:text-3xl tabular">{outbidCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">action required</div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card border-warning/30 bg-warning/5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-warning">
            <Trophy className="size-3.5" /> Auctions Won
          </div>
          <div className="mt-2 text-2xl font-bold text-warning sm:text-3xl tabular">{wonCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">successful claims</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "bids" | "sales")}>
          <div className="flex items-center justify-between border-b pb-2">
            <TabsList className="bg-muted/70">
              <TabsTrigger value="bids" className="gap-2">
                <ShoppingBag className="size-4" /> Your Bids ({participations.length})
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-2">
                <Store className="size-4" /> Your Listings ({sellerListings.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: BUYER PARTICIPATION */}
          <TabsContent value="bids" className="mt-6 space-y-4">
            {myBidsQ.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading your bids...</div>
            ) : participations.length === 0 ? (
              <EmptyState
                icon={Gavel}
                title="No bids yet"
                description="Explore the marketplace and place your first bid."
                action={
                  <Button asChild variant="hero">
                    <Link to="/auctions" search={{ tab: "active", sort: "ending" }}>
                      Browse live auctions
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y rounded-2xl border bg-card shadow-card overflow-hidden">
                {participations.map((p) => (
                  <BuyerParticipationRow key={p.auction.id} p={p} uid={uid} now={now} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SELLER LISTINGS */}
          <TabsContent value="sales" className="mt-6 space-y-4">
            {!isSeller ? (
              <div className="rounded-2xl border bg-card p-8 text-center shadow-card max-w-lg mx-auto my-6">
                <Store className="size-12 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold">Seller account not active</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You are currently registered as a buyer. Activate seller privileges to list items for auction.
                </p>
                <Button asChild variant="hero" className="mt-5">
                  <Link to="/sell">Activate Seller Account</Link>
                </Button>
              </div>
            ) : sellerQ.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading your listings...</div>
            ) : sellerListings.length === 0 ? (
              <EmptyState
                icon={PlusCircle}
                title="No listings yet"
                description="Create your first auction listing to start receiving live bids."
                action={
                  <Button asChild variant="hero">
                    <Link to="/sell">Create listing</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y rounded-2xl border bg-card shadow-card overflow-hidden">
                {sellerListings.map((auction) => (
                  <SellerListingRow key={auction.id} auction={auction} now={now} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BuyerParticipationRow({ p, uid, now }: { p: MyParticipation; uid: string; now: number }) {
  const { auction, myTopBid, myBidCount } = p;
  const prod = auction.product;
  const status = effectiveStatus(auction, now);
  const closed = status === "completed";
  const isWinning = auction.highest_bidder_id === uid;
  const isWinner = closed && auction.winner_id === uid;
  const isOutbid = !closed && status !== "upcoming" && !isWinning;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/40 transition">
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/auctions/$id" params={{ id: auction.id }} className="shrink-0 size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border">
          <img
            src={prod.image_urls[0] || "/images/products/camera.jpg"}
            alt={prod.name}
            className="size-full object-cover"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} />
            {isWinner ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                <Trophy className="size-3 text-warning" /> Won by You
              </span>
            ) : isWinning && !closed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
                <Crown className="size-3" /> Leading Bidder
              </span>
            ) : isOutbid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                <AlertCircle className="size-3" /> Outbid
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">{prod.category}</span>
          </div>

          <Link
            to="/auctions/$id"
            params={{ id: auction.id }}
            className="font-semibold text-base sm:text-lg hover:text-primary transition line-clamp-1 mt-1"
          >
            {prod.name}
          </Link>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Your Top Bid: <strong className="text-foreground">{formatMoney(myTopBid)}</strong></span>
            <span>·</span>
            <span>You bid {myBidCount} time{myBidCount === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground text-left sm:text-right">
            {closed ? "Final Sale" : "Current High Bid"}
          </div>
          <div className="text-lg font-bold text-foreground tabular text-left sm:text-right">
            {formatMoney(auction.current_bid ?? auction.starting_price)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!closed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <Countdown to={status === "upcoming" ? auction.start_time : auction.end_time} />
            </div>
          )}
          <Button asChild size="sm" variant={isOutbid ? "hero" : "outline"}>
            <Link to="/auctions/$id" params={{ id: auction.id }}>
              {isOutbid ? "Increase Bid" : "View"} <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SellerListingRow({ auction, now }: { auction: AuctionWithProduct; now: number }) {
  const prod = auction.product;
  const status = effectiveStatus(auction, now);
  const closed = status === "completed";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/40 transition">
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/auctions/$id" params={{ id: auction.id }} className="shrink-0 size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border">
          <img
            src={prod.image_urls[0] || "/images/products/camera.jpg"}
            alt={prod.name}
            className="size-full object-cover"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} />
            <span className="text-xs text-muted-foreground">{prod.category}</span>
          </div>

          <Link
            to="/auctions/$id"
            params={{ id: auction.id }}
            className="font-semibold text-base sm:text-lg hover:text-primary transition line-clamp-1 mt-1"
          >
            {prod.name}
          </Link>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Starting: {formatMoney(auction.starting_price)}</span>
            <span>·</span>
            <span>{auction.bid_count} total bids</span>
            {auction.highest_bidder && (
              <>
                <span>·</span>
                <span>Top bidder: {auction.highest_bidder.display_name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground text-left sm:text-right">
            {closed ? (auction.winner ? "Sold for" : "Result") : "Current Bid"}
          </div>
          <div className="text-lg font-bold text-foreground tabular text-left sm:text-right">
            {closed && !auction.winner ? "Ended (No bids)" : formatMoney(auction.current_bid ?? auction.starting_price)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!closed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <Countdown to={status === "upcoming" ? auction.start_time : auction.end_time} />
            </div>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/auctions/$id" params={{ id: auction.id }}>
              View Listing <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
