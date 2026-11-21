import { useEffect, useRef } from "react";
import { countdownParts, formatCountdown } from "@/lib/auction-rules";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

/** Inline countdown text. Calls onElapsed once when the target time passes. */
export function Countdown({
  to,
  className,
  onElapsed,
}: {
  to: string;
  className?: string;
  onElapsed?: (() => void) | undefined;
}) {
  const now = useNow();
  const p = countdownParts(to, now || Date.now());
  const fired = useRef(false);
  useEffect(() => {
    if (now && p.totalMs === 0 && !fired.current) {
      fired.current = true;
      onElapsed?.();
    }
  }, [now, p.totalMs, onElapsed]);
  return <span className={cn("tabular", className)}>{now ? formatCountdown(p) : "--:--:--"}</span>;
}

/** Large segmented countdown for the auction detail page. */
export function CountdownBlocks({
  to,
  urgent,
  onElapsed,
}: {
  to: string;
  urgent?: boolean;
  onElapsed?: (() => void) | undefined;
}) {
  const now = useNow();
  const p = countdownParts(to, now || Date.now());
  const fired = useRef(false);
  useEffect(() => {
    if (now && p.totalMs === 0 && !fired.current) {
      fired.current = true;
      onElapsed?.();
    }
  }, [now, p.totalMs, onElapsed]);
  const segs = [
    { v: p.days, l: "Days" },
    { v: p.hours, l: "Hours" },
    { v: p.minutes, l: "Min" },
    { v: p.seconds, l: "Sec" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {segs.map((s) => (
        <div
          key={s.l}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-center",
            urgent ? "border-live/40 bg-live/15" : "border-navy-border bg-navy-elevated",
          )}
        >
          <div className={cn("tabular text-2xl font-semibold sm:text-3xl", urgent ? "text-live" : "text-navy-foreground")}>
            {now ? String(s.v).padStart(2, "0") : "--"}
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-navy-muted">{s.l}</div>
        </div>
      ))}
    </div>
  );
}
