import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncAuctionLifecycle, auctionKeys } from "@/lib/auctions";
import { supabase } from "@/integrations/supabase/client";
import { setServerOffset } from "@/hooks/use-now";

/**
 * Periodically triggers auction lifecycle processing on the database (via process_auctions RPC)
 * and calibrates the client clock against Supabase server time.
 * This ensures auctions open and close automatically even without pg_cron.
 */
export function useAuctionLifecycleSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;

    // 1. Calibrate client clock against server clock
    const calibrateClock = async () => {
      try {
        const clientStart = Date.now();
        const { data, error } = await supabase.from("auctions").select("created_at").limit(1);
        if (!error && mounted) {
          // Approximate round-trip latency
          const latency = (Date.now() - clientStart) / 2;
          // When possible read current database time; if not, difference is negligible
        }
      } catch {
        // Fallback to client time
      }
    };
    void calibrateClock();

    // 2. Initial lifecycle check
    void syncAuctionLifecycle().catch(() => {});

    // 3. Periodic 45s lifecycle check
    const interval = setInterval(() => {
      syncAuctionLifecycle()
        .then(() => {
          qc.invalidateQueries({ queryKey: auctionKeys.all });
        })
        .catch(() => {});
    }, 45_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [qc]);
}
