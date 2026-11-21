import { Badge } from "@/components/ui/badge";
import type { EffectiveStatus } from "@/lib/auction-rules";
import { cn } from "@/lib/utils";

const LABEL: Record<EffectiveStatus, string> = {
  active: "Live",
  ending_soon: "Ending soon",
  upcoming: "Upcoming",
  completed: "Closed",
};

export function StatusBadge({ status, className }: { status: EffectiveStatus; className?: string }) {
  const variant = status === "ending_soon" ? "live" : status === "active" ? "active" : status === "upcoming" ? "upcoming" : "completed";
  return (
    <Badge variant={variant} className={cn("gap-1.5 font-semibold uppercase tracking-wide text-[10px]", className)}>
      {(status === "active" || status === "ending_soon") && (
        <span className={cn("size-1.5 rounded-full animate-live-pulse", status === "ending_soon" ? "bg-live-foreground" : "bg-success")} />
      )}
      {LABEL[status]}
    </Badge>
  );
}
