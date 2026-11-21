import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Gavel, Clock, CalendarClock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./StatusBadge";
import { Countdown } from "./Countdown";
import { effectiveStatus, formatMoney } from "@/lib/auction-rules";
import { useNow } from "@/hooks/use-now";
import type { AuctionWithProduct } from "@/lib/auctions";
import { cn } from "@/lib/utils";

export function AuctionCard({
  auction,
  onElapsed,
  footer,
}: {
  auction: AuctionWithProduct;
  onElapsed?: () => void;
  footer?: ReactNode;
}) {
  const now = useNow() || Date.now();
  const status = effectiveStatus(auction, now);
  const p = auction.product;
  const hasBid = auction.current_bid != null;
  const img = p.image_urls[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      <Link to="/auctions/$id" params={{ id: auction.id }} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Gavel className="size-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <StatusBadge status={status} />
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
          {p.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to="/auctions/$id" params={{ id: auction.id }} className="line-clamp-1 font-display text-lg font-semibold leading-snug hover:text-primary">
          {p.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {status === "completed" ? (hasBid ? "Sold for" : "Result") : hasBid ? "Current bid" : "Starting at"}
            </div>
            <div className="tabular mt-0.5 text-lg font-semibold text-foreground">
              {status === "completed" && !hasBid ? "No bids" : formatMoney(auction.current_bid ?? auction.starting_price)}
            </div>
            {hasBid && status !== "completed" && (
              <div className="text-[11px] text-muted-foreground">from {formatMoney(auction.starting_price, true)}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {status === "upcoming" ? "Opens in" : status === "completed" ? "Bids" : "Ends in"}
            </div>
            <div className={cn("mt-0.5 text-lg font-semibold", status === "ending_soon" && "text-live")}>
              {status === "upcoming" ? (
                <Countdown to={auction.start_time} onElapsed={onElapsed} />
              ) : status === "completed" ? (
                <span className="tabular">{auction.bid_count}</span>
              ) : (
                <Countdown to={auction.end_time} onElapsed={onElapsed} />
              )}
            </div>
            {status !== "completed" && (
              <div className="text-[11px] text-muted-foreground">
                {auction.bid_count} bid{auction.bid_count === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>

        {status === "completed" && auction.winner && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="size-3.5 text-warning" /> Won by <span className="font-medium text-foreground">{auction.winner.display_name}</span>
          </div>
        )}

        <div className="mt-auto pt-4">
          {footer ?? (
            <Button asChild variant={status === "completed" ? "outline" : "default"} className="w-full">
              <Link to="/auctions/$id" params={{ id: auction.id }}>
                {status === "upcoming" ? <CalendarClock /> : status === "completed" ? <Trophy /> : <Clock />}
                {status === "completed" ? "View result" : status === "upcoming" ? "Preview auction" : "View auction"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function AuctionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function AuctionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <AuctionCardSkeleton key={i} />
      ))}
    </div>
  );
}
