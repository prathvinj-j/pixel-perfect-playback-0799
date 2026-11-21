import { BellRing, CheckCircle2, Clock, Gavel, PackagePlus, Trophy, TrendingDown, XCircle, type LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export const NOTIFICATION_META: Record<NotificationType, { icon: LucideIcon; tone: string; label: string }> = {
  bid_placed: { icon: CheckCircle2, tone: "bg-success-soft text-success", label: "Bid placed" },
  outbid: { icon: TrendingDown, tone: "bg-live-soft text-live", label: "Outbid" },
  new_bid_received: { icon: Gavel, tone: "bg-accent text-accent-foreground", label: "New bid" },
  ending_soon: { icon: Clock, tone: "bg-warning-soft text-warning", label: "Ending soon" },
  auction_completed: { icon: BellRing, tone: "bg-secondary text-secondary-foreground", label: "Auction closed" },
  auction_won: { icon: Trophy, tone: "bg-warning-soft text-warning", label: "You won" },
  auction_lost: { icon: XCircle, tone: "bg-secondary text-muted-foreground", label: "Auction lost" },
  listing_created: { icon: PackagePlus, tone: "bg-accent text-accent-foreground", label: "Listing live" },
};
