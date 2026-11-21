import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flame, Radio, Zap } from "lucide-react";
import { formatMoney } from "@/lib/auction-rules";
import { featuredQuery } from "@/lib/auctions";

export function LiveActivityTicker() {
  const { data: auctions = [] } = useQuery(featuredQuery());

  const activeAuctions = auctions.filter((a) => a.bid_count > 0).slice(0, 5);

  if (activeAuctions.length === 0) return null;

  return (
    <div className="border-b border-navy-border/60 bg-navy-elevated/90 text-navy-foreground py-2 px-4 overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 shrink-0 font-bold uppercase tracking-wider text-live">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-live opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-live" />
          </span>
          Live Floor
        </span>

        <span className="text-navy-muted shrink-0">|</span>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
          {activeAuctions.map((a) => (
            <Link
              key={a.id}
              to="/auctions/$id"
              params={{ id: a.id }}
              className="inline-flex items-center gap-1.5 hover:text-primary transition group"
            >
              <Zap className="size-3 text-warning group-hover:scale-110 transition-transform" />
              <span className="font-medium text-navy-muted group-hover:text-foreground">{a.product.name}:</span>
              <span className="font-bold text-foreground tabular">
                {formatMoney(a.current_bid ?? a.starting_price)}
              </span>
              <span className="text-[10px] text-navy-muted">({a.bid_count} bid{a.bid_count === 1 ? "" : "s"})</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
