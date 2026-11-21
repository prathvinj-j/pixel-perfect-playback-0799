import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url">;
export type SellerProfile = Profile & Pick<Tables<"profiles">, "bio" | "location" | "created_at">;

export type AuctionWithProduct = Tables<"auctions"> & {
  product: Tables<"products">;
  seller: SellerProfile | null;
  highest_bidder: Profile | null;
  winner: Profile | null;
};

export type BidWithBidder = Tables<"bids"> & { bidder: Profile | null };

export const AUCTION_SELECT = `*,
  product:products!auctions_product_id_fkey!inner(*),
  seller:profiles!auctions_seller_id_fkey(id, display_name, avatar_url, bio, location, created_at),
  highest_bidder:profiles!auctions_highest_bidder_id_fkey(id, display_name, avatar_url),
  winner:profiles!auctions_winner_id_fkey(id, display_name, avatar_url)`;

export type MarketTab = "active" | "ending" | "upcoming" | "completed" | "all";
export type MarketSort = "ending" | "newest" | "price_asc" | "price_desc" | "bids";

export interface MarketFilters {
  q?: string;
  category?: string;
  tab: MarketTab;
  sort: MarketSort;
}

export const auctionKeys = {
  all: ["auctions"] as const,
  list: (f: MarketFilters) => ["auctions", "list", f] as const,
  featured: ["auctions", "featured"] as const,
  detail: (id: string) => ["auctions", "detail", id] as const,
  bids: (id: string) => ["auctions", "bids", id] as const,
  byIds: (ids: string[]) => ["auctions", "byIds", ids] as const,
  seller: (uid: string) => ["auctions", "seller", uid] as const,
  myBids: (uid: string) => ["auctions", "myBids", uid] as const,
};

export function displayPrice(a: Pick<Tables<"auctions">, "current_bid" | "starting_price">) {
  return Number(a.current_bid ?? a.starting_price);
}

function sortAuctions(list: AuctionWithProduct[], sort: MarketSort) {
  const out = [...list];
  switch (sort) {
    case "price_asc":
      return out.sort((a, b) => displayPrice(a) - displayPrice(b));
    case "price_desc":
      return out.sort((a, b) => displayPrice(b) - displayPrice(a));
    case "bids":
      return out.sort((a, b) => b.bid_count - a.bid_count);
    case "newest":
      return out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    case "ending":
    default:
      return out;
  }
}

export const marketQuery = (f: MarketFilters) =>
  queryOptions({
    queryKey: auctionKeys.list(f),
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let q = supabase.from("auctions").select(AUCTION_SELECT).limit(120);
      if (f.category) q = q.eq("product.category", f.category);
      if (f.q?.trim()) q = q.ilike("product.name", `%${f.q.trim().replace(/[%_,()]/g, " ")}%`);
      switch (f.tab) {
        case "active":
          q = q.neq("status", "completed").lte("start_time", nowIso).gt("end_time", nowIso).order("end_time");
          break;
        case "ending": {
          const soon = new Date(Date.now() + 24 * 3600_000).toISOString();
          q = q.neq("status", "completed").lte("start_time", nowIso).gt("end_time", nowIso).lte("end_time", soon).order("end_time");
          break;
        }
        case "upcoming":
          q = q.neq("status", "completed").gt("start_time", nowIso).order("start_time");
          break;
        case "completed":
          q = q.or(`status.eq.completed,end_time.lte.${nowIso}`).order("end_time", { ascending: false });
          break;
        default:
          q = q.order("end_time");
      }
      const { data, error } = await q;
      if (error) throw error;
      return sortAuctions((data ?? []) as unknown as AuctionWithProduct[], f.sort);
    },
  });

export const featuredQuery = () =>
  queryOptions({
    queryKey: auctionKeys.featured,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("auctions")
        .select(AUCTION_SELECT)
        .neq("status", "completed")
        .gt("end_time", nowIso)
        .order("end_time")
        .limit(24);
      if (error) throw error;
      return (data ?? []) as unknown as AuctionWithProduct[];
    },
  });

export const auctionQuery = (id: string) =>
  queryOptions({
    queryKey: auctionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("auctions").select(AUCTION_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AuctionWithProduct | null;
    },
  });

export const bidsQuery = (auctionId: string) =>
  queryOptions({
    queryKey: auctionKeys.bids(auctionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("*, bidder:profiles!bids_bidder_id_fkey(id, display_name, avatar_url)")
        .eq("auction_id", auctionId)
        .order("amount", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as BidWithBidder[];
    },
  });

export const sellerAuctionsQuery = (uid: string) =>
  queryOptions({
    queryKey: auctionKeys.seller(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(AUCTION_SELECT)
        .eq("seller_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuctionWithProduct[];
    },
  });

export interface MyParticipation {
  auction: AuctionWithProduct;
  myTopBid: number;
  myBidCount: number;
  lastBidAt: string;
}

export const myBidsQuery = (uid: string) =>
  queryOptions({
    queryKey: auctionKeys.myBids(uid),
    queryFn: async (): Promise<MyParticipation[]> => {
      const { data: bids, error } = await supabase
        .from("bids")
        .select("auction_id, amount, created_at")
        .eq("bidder_id", uid)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const byAuction = new Map<string, { top: number; count: number; last: string }>();
      for (const b of bids ?? []) {
        const cur = byAuction.get(b.auction_id);
        if (!cur) byAuction.set(b.auction_id, { top: Number(b.amount), count: 1, last: b.created_at });
        else {
          cur.top = Math.max(cur.top, Number(b.amount));
          cur.count += 1;
        }
      }
      const ids = [...byAuction.keys()];
      if (ids.length === 0) return [];
      const { data: auctions, error: e2 } = await supabase.from("auctions").select(AUCTION_SELECT).in("id", ids);
      if (e2) throw e2;
      return ((auctions ?? []) as unknown as AuctionWithProduct[])
        .map((a) => {
          const m = byAuction.get(a.id)!;
          return { auction: a, myTopBid: m.top, myBidCount: m.count, lastBidAt: m.last };
        })
        .sort((x, y) => +new Date(y.lastBidAt) - +new Date(x.lastBidAt));
    },
  });

export const notificationsQuery = (uid: string, limit = 50) =>
  queryOptions({
    queryKey: ["notifications", uid, limit] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Ask the server to open/close auctions whose times have passed (uses the server clock only). */
export async function syncAuctionLifecycle() {
  await supabase.rpc("process_auctions");
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}
