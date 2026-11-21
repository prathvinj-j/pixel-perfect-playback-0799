import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-navy-border bg-navy text-navy-muted">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm">
            Timed auctions with transparent bidding. Every bid is checked and recorded on our servers, and winners are
            declared automatically when the clock runs out.
          </p>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-navy-foreground">Marketplace</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auctions" search={{ tab: "active", sort: "ending" }} className="hover:text-navy-foreground">Live auctions</Link></li>
            <li><Link to="/auctions" search={{ tab: "upcoming", sort: "ending" }} className="hover:text-navy-foreground">Upcoming</Link></li>
            <li><Link to="/auctions" search={{ tab: "completed", sort: "ending" }} className="hover:text-navy-foreground">Results</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-navy-foreground">Members</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-navy-foreground">Create an account</Link></li>
            <li><Link to="/sell" className="hover:text-navy-foreground">Sell an item</Link></li>
            <li><Link to="/dashboard" className="hover:text-navy-foreground">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-border py-5 text-center text-xs">© {new Date().getFullYear()} Hammerline. All bids are binding.</div>
    </footer>
  );
}
