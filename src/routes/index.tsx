import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, type ReactNode } from "react";
import { ArrowRight, Flame, Gavel, ShieldCheck, Timer, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuctionCard, AuctionGridSkeleton } from "@/components/auction/AuctionCard";
import { Countdown } from "@/components/auction/Countdown";
import { EmptyState } from "@/components/site/EmptyState";
import { auctionKeys, featuredQuery, syncAuctionLifecycle } from "@/lib/auctions";
import { CATEGORIES, effectiveStatus, formatMoney } from "@/lib/auction-rules";
import { useNow } from "@/hooks/use-now";
import { useAuctionsListRealtime } from "@/hooks/use-auction-realtime";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hammerline — Live Auctions for Vintage, Design & Tech" },
      { name: "description", content: "Discover live timed auctions, bid in real time and watch winners get declared automatically the second the clock hits zero." },
      { property: "og:title", content: "Hammerline — Live Auctions for Vintage, Design & Tech" },
      { property: "og:description", content: "Live timed auctions with transparent, server-verified bidding and automatic winners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(featuredQuery());
  const now = useNow() || Date.now();
  useAuctionsListRealtime();
  const onElapsed = useCallback(async () => {
    await syncAuctionLifecycle();
    qc.invalidateQueries({ queryKey: auctionKeys.all });
  }, [qc]);

  const all = data ?? [];
  const live = all.filter((a) => {
    const s = effectiveStatus(a, now);
    return s === "active" || s === "ending_soon";
  });
  const upcoming = all.filter((a) => effectiveStatus(a, now) === "upcoming");
  const endingSoon = live.slice(0, 3);
  const spotlight = live[0];
  const totalBids = live.reduce((s, a) => s + a.bid_count, 0);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-stage text-navy-foreground">
        <img
          src="/images/hero-auction.jpg"
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover opacity-90 lg:block"
        />
        <div className="absolute inset-0 hidden bg-fade-left lg:block" />
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
          <div className="max-w-2xl animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-border bg-navy-elevated/70 px-3 py-1 text-xs font-medium text-navy-muted backdrop-blur">
              <span className="size-2 rounded-full bg-live animate-live-pulse" />
              {isLoading ? "Loading live floor…" : `${live.length} auctions live · ${totalBids} bids placed`}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-6xl">
              Every bid, live.
              <br />
              <span className="text-gradient-primary">Every winner, fair.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-navy-muted sm:text-lg">
              Bid on curated vintage, design and tech in timed auctions. Every bid is verified on our servers, broadcast
              to everyone watching, and the highest bidder wins the moment the clock hits zero.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/auctions" search={{ tab: "active", sort: "ending" }}>
                  Explore live auctions <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="stage" size="xl">
                <Link to="/sell">
                  <Gavel /> Start selling
                </Link>
              </Button>
            </div>
          </div>

          {spotlight && (
            <Link
              to="/auctions/$id"
              params={{ id: spotlight.id }}
              className="mt-12 flex max-w-md items-center gap-4 rounded-2xl border border-navy-border bg-navy-elevated/80 p-3 pr-5 backdrop-blur transition hover:border-primary/60"
            >
              <img src={spotlight.product.image_urls[0]} alt="" className="size-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-live">Closing next</div>
                <div className="truncate font-medium">{spotlight.product.name}</div>
                <div className="mt-0.5 flex items-center gap-3 text-sm text-navy-muted">
                  <span className="tabular text-navy-foreground">{formatMoney(spotlight.current_bid ?? spotlight.starting_price)}</span>
                  <span className="flex items-center gap-1"><Timer className="size-3.5" /><Countdown to={spotlight.end_time} onElapsed={onElapsed} /></span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto -mt-7 max-w-7xl px-4 sm:px-6">
        <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-elevated">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to="/auctions"
              search={{ tab: "all", sort: "ending", category: c }}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* ENDING SOON */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <SectionHead icon={<Flame className="text-live" />} title="Closing soonest" subtitle="Last chance to get your bid in." to="ending" />
        {isLoading ? (
          <AuctionGridSkeleton count={3} />
        ) : endingSoon.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {endingSoon.map((a) => <AuctionCard key={a.id} auction={a} onElapsed={onElapsed} />)}
          </div>
        ) : (
          <EmptyState icon={Gavel} title="No live auctions right now" description="New lots open regularly. Check upcoming auctions." />
        )}
      </section>

      {/* LIVE */}
      {live.length > 3 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <SectionHead icon={<Zap className="text-primary" />} title="Live on the floor" subtitle="Bidding is open right now." to="active" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.slice(3, 9).map((a) => <AuctionCard key={a.id} auction={a} onElapsed={onElapsed} />)}
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-stage p-8 text-navy-foreground sm:p-12">
          <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">Transparent by design</h2>
          <p className="mt-3 max-w-xl text-navy-muted">No hidden reserves, no last-second tricks. The rules are the same for everyone, and they're enforced on the server.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "Server-verified bids", d: "Each bid is checked against the live high bid and the clock on our servers. Late or low bids are rejected." },
              { icon: Zap, t: "Real-time for everyone", d: "New bids, price changes and closings appear instantly for every participant. No refreshing." },
              { icon: Trophy, t: "Automatic winners", d: "When time runs out the auction locks, and the highest valid bidder is declared the winner." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-navy-border bg-navy-elevated/70 p-6">
                <div className="grid size-11 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                  <Icon className="size-5 text-primary-foreground" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-navy-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <SectionHead icon={<Timer className="text-upcoming" />} title="Opening soon" subtitle="Preview lots before bidding starts." to="upcoming" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((a) => <AuctionCard key={a.id} auction={a} onElapsed={onElapsed} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({
  icon,
  title,
  subtitle,
  to,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  to: "ending" | "active" | "upcoming";
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl [&_svg]:size-6">{icon}{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Button asChild variant="ghost" className="shrink-0">
        <Link to="/auctions" search={{ tab: to, sort: "ending" }}>View all <ArrowRight /></Link>
      </Button>
    </div>
  );
}
