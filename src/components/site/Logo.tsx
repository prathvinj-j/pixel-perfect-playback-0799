import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const APP_NAME = "Hammerline";

export function Logo({ className, tone = "stage" }: { className?: string; tone?: "stage" | "light" }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${APP_NAME} home`}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-xl font-bold tracking-tight",
          tone === "stage" ? "text-navy-foreground" : "text-foreground",
        )}
      >
        {APP_NAME}
      </span>
    </Link>
  );
}
