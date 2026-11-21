import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gavel, PlusCircle, ShoppingBag } from "lucide-react";
import { AuctionCard } from "@/components/auction/AuctionCard";
import { EmptyState } from "@/components/site/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { myBidsQuery, sellerAuctionsQuery } from "@/lib/auctions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Hammerline" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isBuyer, isSeller } = useAuth();
  const uid = user?.id;
  const bids = useQuery({ ...myBidsQuery(uid ?? ""), enabled: !!uid && isBuyer });
  const listings = useQuery({ ...sellerAuctionsQuery(uid ?? ""), enabled: !!uid && isSeller });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your bids and listings, synced with Supabase.</p>
        </div>
        {isSeller && (
          <Button asChild variant="hero"><Link to="/sell"><PlusCircle /> New listing</Link></Button>
        )}
      </div>

      {isBuyer && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><ShoppingBag /> Your bids</h2>
          {bids.isLoading ? null : bids.data?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {bids.data.map(({ auction }) => <AuctionCard key={auction.id} auction={auction} />)}
            </div>
          ) : (
            <EmptyState icon={Gavel} title="No bids yet" description="Explore the marketplace and place your first bid." action={<Button asChild><Link to="/auctions" search={{ tab: "active", sort: "ending" }}>Browse auctions</Link></Button>} />
          )}
        </section>
      )}

      {isSeller && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Gavel /> Your listings</h2>
          {listings.isLoading ? null : listings.data?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.data.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
            </div>
          ) : (
            <EmptyState icon={PlusCircle} title="No listings yet" description="Create your first auction listing." action={<Button asChild variant="hero"><Link to="/sell">Create listing</Link></Button>} />
          )}
        </section>
      )}
    </div>
  );
}
