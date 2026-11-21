import { useMemo } from "react";
import { TrendingUp, Zap, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/auction-rules";
import type { BidWithBidder } from "@/lib/auctions";
import { format } from "date-fns";

interface BidVelocityChartProps {
  bids: BidWithBidder[];
  startingPrice: number;
}

export function BidVelocityChart({ bids, startingPrice }: BidVelocityChartProps) {
  // Chronological order (oldest to newest)
  const points = useMemo(() => {
    const list = [...bids].reverse();
    if (list.length === 0) return [];

    // Starting point
    const firstBidTime = new Date(list[0]!.created_at).getTime();
    const result = [
      {
        label: "Start",
        amount: startingPrice,
        time: new Date(firstBidTime - 3600_000).toISOString(),
        bidder: "Opening Price",
      },
    ];

    list.forEach((b, idx) => {
      result.push({
        label: `#${idx + 1}`,
        amount: Number(b.amount),
        time: b.created_at,
        bidder: b.bidder?.display_name || "Bidder",
      });
    });

    return result;
  }, [bids, startingPrice]);

  if (points.length <= 1) {
    return null;
  }

  const minVal = startingPrice * 0.95;
  const maxVal = Math.max(...points.map((p) => p.amount)) * 1.05;
  const range = maxVal - minVal || 1;

  const width = 500;
  const height = 120;
  const paddingX = 20;
  const paddingY = 15;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const coords = points.map((p, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * innerW;
    const y = height - paddingY - ((p.amount - minVal) / range) * innerH;
    return { x, y, ...p };
  });

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Area under line
  const areaD = `${pathD} L ${coords[coords.length - 1]!.x} ${height - paddingY} L ${coords[0]!.x} ${height - paddingY} Z`;

  const topAmount = points[points.length - 1]!.amount;
  const appreciation = Math.round(((topAmount - startingPrice) / startingPrice) * 100);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <TrendingUp className="size-4 text-primary" /> Price Progression Timeline
        </div>
        <div className="flex items-center gap-2">
          {appreciation > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-bold text-success text-[11px]">
              +{appreciation}% lift
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Zap className="size-3 text-warning" /> {bids.length} bid{bids.length === 1 ? "" : "s"} placed
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Grid reference line */}
          <line
            x1={paddingX}
            y1={coords[0]!.y}
            x2={width - paddingX}
            y2={coords[0]!.y}
            stroke="var(--border)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {coords.map((pt, i) => {
            const isLatest = i === coords.length - 1;
            const isFirst = i === 0;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isLatest ? 5 : 3.5}
                  className={isLatest ? "fill-primary stroke-card stroke-2" : "fill-muted-foreground stroke-card stroke-1"}
                />
              </g>
            );
          })}
        </svg>

        {/* Labels under chart */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t">
          <span>Start: {formatMoney(startingPrice, true)}</span>
          <span className="font-semibold text-primary">Current: {formatMoney(topAmount, true)}</span>
        </div>
      </div>
    </div>
  );
}
