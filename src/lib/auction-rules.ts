// Display-side mirror of the bidding rules enforced in the database (place_bid / process_auctions).
// The server is authoritative; these helpers only drive what the UI shows.

export type EffectiveStatus = "upcoming" | "active" | "ending_soon" | "completed";

export interface AuctionTiming {
  status: "upcoming" | "active" | "completed";
  start_time: string;
  end_time: string;
}

export const ENDING_SOON_MS = 60 * 60 * 1000; // last hour reads as "ending soon"
export const FINAL_MINUTES_MS = 10 * 60 * 1000; // matches the server-side 10-minute warning

export function effectiveStatus(a: AuctionTiming, now: number): EffectiveStatus {
  const start = new Date(a.start_time).getTime();
  const end = new Date(a.end_time).getTime();
  if (a.status === "completed" || now >= end) return "completed";
  if (now < start) return "upcoming";
  if (end - now <= ENDING_SOON_MS) return "ending_soon";
  return "active";
}

export function isBiddable(a: AuctionTiming, now: number): boolean {
  const s = effectiveStatus(a, now);
  return s === "active" || s === "ending_soon";
}

export function minNextBid(a: {
  current_bid: number | null;
  starting_price: number;
  min_increment: number;
}): number {
  if (a.current_bid == null) return Number(a.starting_price);
  return round2(Number(a.current_bid) + Number(a.min_increment));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns an error message for an amount the server would reject, or null if it looks valid. */
export function validateBidAmount(
  amount: number,
  a: { current_bid: number | null; starting_price: number; min_increment: number },
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid bid amount.";
  if (round2(amount) !== amount) return "Bids can have at most 2 decimal places.";
  const min = minNextBid(a);
  if (amount < min) return `Your bid must be at least ${formatMoney(min)}.`;
  return null;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyShort = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(n: number | null | undefined, short = false): string {
  if (n == null) return "—";
  const v = Number(n);
  return short && Number.isInteger(v) ? moneyShort.format(v) : money.format(v);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function countdownParts(targetIso: string, now: number): CountdownParts {
  const totalMs = Math.max(0, new Date(targetIso).getTime() - now);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
  };
}

export function formatCountdown(p: CountdownParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (p.days > 0) return `${p.days}d ${pad(p.hours)}h ${pad(p.minutes)}m`;
  return `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
}

export const CATEGORIES = [
  "Electronics",
  "Collectibles",
  "Fashion",
  "Furniture",
  "Gadgets",
  "Art",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
] as const;
export type Condition = (typeof CONDITIONS)[number]["value"];

export function conditionLabel(c: string): string {
  return CONDITIONS.find((x) => x.value === c)?.label ?? c;
}
