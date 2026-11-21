import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery, auctionKeys } from "@/lib/auctions";
import { NOTIFICATION_META, type NotificationType } from "@/lib/notification-meta";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const { data = [] } = useQuery(notificationsQuery(uid, 12));
  const unread = data.filter((n) => !n.read).length;

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="stage-ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-live-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-display font-semibold">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {data.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            data.map((n) => <NotificationRow key={n.id} n={n} compact />)
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full">
            <Link to="/notifications">See all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NotificationRow({
  n,
  compact,
}: {
  n: { id: string; type: NotificationType; message: string; auction_id: string | null; read: boolean; created_at: string };
  compact?: boolean;
}) {
  const meta = NOTIFICATION_META[n.type];
  const Icon = meta.icon;
  const body = (
    <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60", !n.read && "bg-accent/40")}>
      <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl", meta.tone)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
          {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
        </div>
        <p className={cn("text-sm text-foreground", compact && "line-clamp-2")}>{n.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
      </div>
    </div>
  );
  return n.auction_id ? (
    <Link to="/auctions/$id" params={{ id: n.auction_id }} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Subscribes to the signed-in member's notifications and pops a toast for each new one. */
export function NotificationListener() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notifications-${uid}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new as { type: NotificationType; message: string };
          const meta = NOTIFICATION_META[n.type];
          const fn = n.type === "outbid" ? toast.warning : n.type === "auction_won" || n.type === "bid_placed" ? toast.success : toast.info;
          // Bid confirmations are already shown by the bid form itself.
          if (n.type !== "bid_placed" && n.type !== "listing_created") fn(meta.label, { description: n.message });
          qc.invalidateQueries({ queryKey: ["notifications", uid] });
          qc.invalidateQueries({ queryKey: auctionKeys.myBids(uid) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);
  return null;
}
