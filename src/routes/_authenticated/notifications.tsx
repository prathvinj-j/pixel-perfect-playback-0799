import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/EmptyState";
import { NotificationRow } from "@/components/site/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery } from "@/lib/auctions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications | Hammerline" }, { name: "description", content: "Your auction notifications." }, { property: "og:title", content: "Notifications | Hammerline" }, { property: "og:description", content: "Your auction notifications." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ ...notificationsQuery(uid, 100), enabled: !!uid });
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}><CheckCheck /> Mark all read</Button>
      </div>
      {isLoading ? null : data.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Bid on an auction or list an item to get updates here." />
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">{data.map((n) => <NotificationRow key={n.id} n={n} />)}</div>
      )}
    </div>
  );
}
