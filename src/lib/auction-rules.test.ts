import { describe, expect, it } from "vitest";
import { effectiveStatus, minNextBid, validateBidAmount } from "./auction-rules";

const now = new Date("2026-11-21T12:00:00Z").getTime();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const H = 3600_000;

describe("auction rules", () => {
  it("first bid must be at least the starting price", () => {
    expect(minNextBid({ current_bid: null, starting_price: 850, min_increment: 25 })).toBe(850);
  });

  it("next bid must beat the current bid by the minimum increment", () => {
    expect(minNextBid({ current_bid: 1000, starting_price: 850, min_increment: 25 })).toBe(1025);
    expect(validateBidAmount(1024.99, { current_bid: 1000, starting_price: 850, min_increment: 25 })).toMatch(
      /at least \$1,025\.00/,
    );
    expect(validateBidAmount(1025, { current_bid: 1000, starting_price: 850, min_increment: 25 })).toBeNull();
  });

  it("rejects amounts with more than 2 decimals", () => {
    expect(validateBidAmount(900.005, { current_bid: null, starting_price: 850, min_increment: 25 })).toMatch(/2 decimal/);
  });

  it("auction is completed once its end time is reached, even if not yet closed by the server", () => {
    expect(effectiveStatus({ status: "active", start_time: iso(-5 * H), end_time: iso(0) }, now)).toBe("completed");
  });

  it("auction is upcoming before its start time", () => {
    expect(effectiveStatus({ status: "upcoming", start_time: iso(H), end_time: iso(5 * H) }, now)).toBe("upcoming");
  });

  it("auction with under an hour left reads as ending soon", () => {
    expect(effectiveStatus({ status: "active", start_time: iso(-H), end_time: iso(30 * 60_000) }, now)).toBe("ending_soon");
    expect(effectiveStatus({ status: "active", start_time: iso(-H), end_time: iso(2 * H) }, now)).toBe("active");
  });
});
