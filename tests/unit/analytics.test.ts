import { describe, expect, it } from "vitest";
import { bucketByDay, demandPoints, distanceBands, formatMinutes, pctDelta, priceGap, summarize, totalsFor, type EventRow } from "@/lib/analytics";
import { formatCompactINR } from "@/lib/money";

const NOW = new Date("2026-11-10T12:00:00Z");
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();

const events: EventRow[] = [
  { t: ago(0, 1), k: "R", d: 3, la: 12.93, ln: 77.62 },
  { t: ago(0, 2), k: "R", d: 7, la: 12.93, ln: 77.62 },
  { t: ago(0, 2), k: "O", a: 1000, r: 30 },
  { t: ago(1), k: "W", a: 1200 },
  { t: ago(2), k: "L", a: 1300, c: 1000 },
  { t: ago(2), k: "L", a: 900, c: 800 },
  { t: ago(5), k: "R", d: 18, la: 12.99, ln: 77.7 },
  { t: ago(5), k: "O", a: 700, r: 90 },
  { t: ago(12), k: "R", d: 12 }, // previous 7-day window
  { t: ago(12), k: "W", a: 500 },
  { t: ago(40), k: "R", d: 1 }, // outside 30 days
];

describe("bucketByDay", () => {
  it("returns one zero-filled row per day, oldest first, in India time", () => {
    const rows = bucketByDay(events, 7, NOW);
    expect(rows).toHaveLength(7);
    expect(rows[6].date).toBe("2026-11-10");
    expect(rows[0].date).toBe("2026-11-04");
    expect(rows[6]).toMatchObject({ received: 2, offered: 1 });
    expect(rows.find((r) => r.date === "2026-11-09")).toMatchObject({ won: 1, wonValue: 1200 });
    expect(rows.find((r) => r.date === "2026-11-08")).toMatchObject({ lost: 2 });
    expect(rows.find((r) => r.date === "2026-11-07")).toMatchObject({ received: 0, offered: 0, won: 0 }); // filled with zeros
  });
  it("ignores events outside the window", () => {
    const rows = bucketByDay(events, 7, NOW);
    expect(rows.reduce((a, r) => a + r.received, 0)).toBe(3);
  });
  it("assigns events to the Indian calendar day (UTC+5:30), not UTC", () => {
    const e: EventRow[] = [{ t: "2026-11-09T19:00:00Z", k: "R" }]; // 00:30 IST on the 10th
    const rows = bucketByDay(e, 3, NOW);
    expect(rows.find((r) => r.date === "2026-11-10")!.received).toBe(1);
    expect(rows.find((r) => r.date === "2026-11-09")!.received).toBe(0);
  });
});

describe("totals & change", () => {
  it("summarises the current and previous window", () => {
    const { current, previous } = summarize(events, 7, NOW);
    expect(current).toMatchObject({ received: 3, offered: 2, won: 1, lost: 2, wonValue: 1200, avgResponseMin: 60 });
    expect(current.winRate).toBeCloseTo(1 / 3);
    expect(current.responseRate).toBeCloseTo(2 / 3);
    expect(previous).toMatchObject({ received: 1, won: 1, wonValue: 500, lost: 0, winRate: 1 });
  });
  it("handles empty windows without dividing by zero", () => {
    const t = totalsFor([], 0, 1);
    expect(t).toMatchObject({ received: 0, winRate: null, responseRate: null, avgResponseMin: null });
  });
  it("caps the response rate at 100% (offers can lag the requests they answer)", () => {
    const e: EventRow[] = [{ t: ago(1), k: "R" }, { t: ago(1), k: "O", a: 1 }, { t: ago(1), k: "O", a: 1 }];
    expect(totalsFor(e, NOW.getTime() - 3 * 86_400_000, NOW.getTime()).responseRate).toBe(1);
  });
  it("computes percentage change, and null when there's no baseline", () => {
    expect(pctDelta(150, 100)).toBe(50);
    expect(pctDelta(50, 100)).toBe(-50);
    expect(pctDelta(0, 0)).toBe(0);
    expect(pctDelta(5, 0)).toBeNull();
  });
});

describe("breakdowns", () => {
  it("bands request distances", () => {
    expect(distanceBands(events, 30, NOW)).toEqual([{ label: "0–5 km", count: 1 }, { label: "5–10 km", count: 1 }, { label: "10–15 km", count: 1 }, { label: "15–20 km", count: 1 }]);
  });
  it("compares the lab's losing bids with the winning prices", () => {
    expect(priceGap(events, 30, NOW)).toEqual({ lostBids: 2, avgYourOffer: 1100, avgWinningPrice: 900, gapPct: 22 });
    expect(priceGap([{ t: ago(1), k: "W", a: 1 }], 30, NOW)).toBeNull();
  });
  it("groups demand into ~1 km areas", () => {
    expect(demandPoints(events, 30, NOW)).toEqual([{ lat: 12.93, lng: 77.62, count: 2 }, { lat: 12.99, lng: 77.7, count: 1 }]);
  });
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(150)).toBe("2.5 h");
    expect(formatMinutes(3000)).toBe("2 d");
  });
  it("formats rupees compactly with Indian units", () => {
    expect(formatCompactINR(950)).toBe("₹950");
    expect(formatCompactINR(12_400)).toBe("₹12.4K");
    expect(formatCompactINR(320_000)).toBe("₹3.2L");
    expect(formatCompactINR(15_000_000)).toBe("₹1.5Cr");
  });
});
