import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuctionCard, AuctionGridSkeleton } from "@/components/auction/AuctionCard";
import { EmptyState } from "@/components/site/EmptyState";
import { auctionKeys, marketQuery, syncAuctionLifecycle, type MarketSort, type MarketTab } from "@/lib/auctions";
import { CATEGORIES } from "@/lib/auction-rules";
import { useAuctionsListRealtime } from "@/hooks/use-auction-realtime";
import { LiveActivityTicker } from "@/components/site/LiveActivityTicker";
import { cn } from "@/lib/utils";

const TABS: { value: MarketTab; label: string }[] = [
  { value: "active", label: "Live now" },
  { value: "ending", label: "Ending in 24h" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];
const SORTS: { value: MarketSort; label: string }[] = [
  { value: "ending", label: "Ending soonest" },
  { value: "newest", label: "Newly listed" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "bids", label: "Most bids" },
];

interface MarketSearch {
  tab?: MarketTab;
  sort?: MarketSort;
  q?: string;
  category?: string;
}

export const Route = createFileRoute("/auctions/")({
  validateSearch: (s: Record<string, unknown>): MarketSearch => {
    const out: MarketSearch = {};
    if (TABS.some((t) => t.value === s["tab"])) out.tab = s["tab"] as MarketTab;
    if (SORTS.some((t) => t.value === s["sort"])) out.sort = s["sort"] as MarketSort;
    if (typeof s["q"] === "string" && s["q"]) out.q = s["q"].slice(0, 80);
    if (typeof s["category"] === "string" && (CATEGORIES as readonly string[]).includes(s["category"])) out.category = s["category"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Marketplace — Live, Upcoming & Completed Auctions | Hammerline" },
      { name: "description", content: "Search and filter live auctions by category, price and time remaining. See upcoming lots and final results." },
      { property: "og:title", content: "Hammerline Marketplace" },
      { property: "og:description", content: "Browse live, upcoming and completed auctions across electronics, collectibles, fashion, furniture, gadgets and art." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/auctions/" });
  const qc = useQueryClient();
  const tab = search.tab ?? "active";
  const sort = search.sort ?? "ending";
  const [q, setQ] = useState(search.q ?? "");
  useAuctionsListRealtime();

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q) navigate({ search: (prev) => ({ ...prev, q: q || undefined }), replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q, search.q, navigate]);

  const filters = { tab, sort, q: search.q, category: search.category };
  const { data, isLoading, isError, refetch } = useQuery(marketQuery(filters));
  const onElapsed = useCallback(async () => {
    await syncAuctionLifecycle();
    qc.invalidateQueries({ queryKey: auctionKeys.all });
  }, [qc]);

  const set = (patch: Partial<MarketSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const hasFilters = !!(search.q || search.category);

  return (
    <div>
      <LiveActivityTicker />
      <section className="bg-stage text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6">
          <h1 className="text-3xl font-bold sm:text-4xl">Marketplace</h1>
          <p className="mt-1 text-navy-muted">Find your next lot. Prices and timers update live.</p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search watches, cameras, chairs…"
                className="h-11 rounded-xl border-0 bg-card pl-10 text-foreground shadow-card"
                aria-label="Search auctions"
              />
            </div>
            <Select value={search.category ?? "all"} onValueChange={(v) => set({ category: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-card text-foreground md:w-48" aria-label="Category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => set({ sort: v as MarketSort })}>
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-card text-foreground md:w-52" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => set({ tab: t.value })}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
                  tab === t.value ? "bg-primary text-primary-foreground shadow-glow" : "text-navy-muted hover:bg-navy-elevated hover:text-navy-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="mb-5 flex min-h-8 flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{isLoading ? "Loading auctions…" : `${data?.length ?? 0} auction${data?.length === 1 ? "" : "s"}`}</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: undefined, category: undefined }); }}>
              <X /> Clear filters
            </Button>
          )}
        </div>
        {isLoading ? (
          <AuctionGridSkeleton />
        ) : isError ? (
          <EmptyState icon={SearchX} title="Couldn't load auctions" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : data && data.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((a) => <AuctionCard key={a.id} auction={a} onElapsed={onElapsed} />)}
          </div>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No auctions match"
            description={hasFilters ? "Try a different search or category." : "Nothing here yet. Check another tab."}
            action={hasFilters ? <Button variant="outline" onClick={() => { setQ(""); set({ q: undefined, category: undefined }); }}>Clear filters</Button> : undefined}
          />
        )}
      </section>
    </div>
  );
}
