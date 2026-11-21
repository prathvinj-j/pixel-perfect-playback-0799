import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { auctionKeys } from "@/lib/auctions";

const uniq = () => Math.random().toString(36).slice(2);

/** Live updates for a single auction: its row and its bids. */
export function useAuctionRealtime(auctionId: string, onNewBid?: () => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`auction-${auctionId}-${uniq()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${auctionId}` }, () => {
        qc.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auctionId}` }, () => {
        qc.invalidateQueries({ queryKey: auctionKeys.bids(auctionId) });
        qc.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
        onNewBid?.();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, qc, onNewBid]);
}

/** Live updates for any list of auctions (marketplace, dashboards). */
export function useAuctionsListRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        qc.invalidateQueries({ queryKey: auctionKeys.all });
      }, 400);
    };
    const channel = supabase
      .channel(`auctions-list-${uniq()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
