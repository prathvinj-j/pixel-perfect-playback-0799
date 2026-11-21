import { formatDistanceToNow, format } from "date-fns";
import { Crown, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/auction-rules";
import type { BidWithBidder } from "@/lib/auctions";
import { initials } from "@/components/site/Navbar";
import { cn } from "@/lib/utils";

export function BidHistory({
  bids,
  loading,
  myId,
  closed,
}: {
  bids: BidWithBidder[];
  loading: boolean;
  myId?: string;
  closed: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><History className="size-5 text-primary" /> Bid history</h2>
        <span className="text-sm text-muted-foreground">{bids.length} bid{bids.length === 1 ? "" : "s"}</span>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : bids.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
          {closed ? "This auction closed without any bids." : "No bids yet. Be the first to bid."}
        </p>
      ) : (
        <ol className="relative space-y-1 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-border">
          {bids.map((b, idx) => {
            const top = idx === 0;
            const mine = b.bidder_id === myId;
            return (
              <li key={b.id} className={cn("relative flex items-center gap-3 rounded-xl px-1 py-2", top && "animate-bid-flash")}>
                <span
                  className={cn(
                    "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-4 border-card text-xs font-semibold",
                    top ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {top ? <Crown className="size-4" /> : initials(b.bidder?.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{b.bidder?.display_name ?? "Bidder"}</span>
                    {mine && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">You</span>}
                    {top && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                        {closed ? "Winning bid" : "Leading"}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground" title={format(new Date(b.created_at), "PPpp")}>
                    {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })} · {format(new Date(b.created_at), "MMM d, HH:mm:ss")}
                  </time>
                </div>
                <span className={cn("tabular text-right font-semibold", top ? "text-foreground" : "text-muted-foreground")}>
                  {formatMoney(b.amount)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
