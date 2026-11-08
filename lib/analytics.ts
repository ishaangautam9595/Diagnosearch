/** Pure aggregation helpers for the lab dashboard (run in the browser so the date range switches instantly). */

/** Compact wire format of a LabEvent. */
export interface EventRow {
  t: string; // ISO timestamp
  k: "R" | "O" | "W" | "L"; // received / offer sent / won / lost
  a?: number; // lab's price
  c?: number; // winning price (on L)
  d?: number; // km (on R)
  r?: number; // response minutes (on O)
  la?: number; ln?: number; // coarse location (on R)
}

export type DayPoint = { date: string; received: number; offered: number; won: number; lost: number; wonValue: number };
export interface Totals { received: number; offered: number; won: number; lost: number; wonValue: number; avgResponseMin: number | null; winRate: number | null; responseRate: number | null }

const DAY = 86_400_000;
const istDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

/** One row per day for the last `days` days (oldest first), zero-filled, in India time. */
export function bucketByDay(events: EventRow[], days: number, now = new Date()): DayPoint[] {
  const out: DayPoint[] = [];
  const idx = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = istDate(new Date(now.getTime() - i * DAY));
    const p: DayPoint = { date, received: 0, offered: 0, won: 0, lost: 0, wonValue: 0 };
    out.push(p); idx.set(date, p);
  }
  for (const e of events) {
    const p = idx.get(istDate(new Date(e.t)));
    if (!p) continue;
    if (e.k === "R") p.received++;
    else if (e.k === "O") p.offered++;
    else if (e.k === "W") { p.won++; p.wonValue += e.a ?? 0; }
    else p.lost++;
  }
  return out;
}

const inWindow = (e: EventRow, from: number, to: number) => { const t = Date.parse(e.t); return t > from && t <= to; };

export function totalsFor(events: EventRow[], fromMs: number, toMs: number): Totals {
  let received = 0, offered = 0, won = 0, lost = 0, wonValue = 0, respSum = 0, respN = 0;
  for (const e of events) {
    if (!inWindow(e, fromMs, toMs)) continue;
    if (e.k === "R") received++;
    else if (e.k === "O") { offered++; if (e.r !== undefined) { respSum += e.r; respN++; } }
    else if (e.k === "W") { won++; wonValue += e.a ?? 0; }
    else lost++;
  }
  return {
    received, offered, won, lost, wonValue,
    avgResponseMin: respN ? Math.round(respSum / respN) : null,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    responseRate: received > 0 ? Math.min(1, offered / received) : null,
  };
}

/** Totals for the last `days` days and for the `days` before that (to show change). */
export function summarize(events: EventRow[], days: number, now = new Date()) {
  const end = now.getTime();
  return { current: totalsFor(events, end - days * DAY, end), previous: totalsFor(events, end - 2 * DAY * days, end - days * DAY) };
}

/** Relative change in percent, or null when there is nothing to compare against. */
export function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

export function distanceBands(events: EventRow[], days: number, now = new Date()) {
  const from = now.getTime() - days * DAY;
  const bands = [{ label: "0–5 km", max: 5, count: 0 }, { label: "5–10 km", max: 10, count: 0 }, { label: "10–15 km", max: 15, count: 0 }, { label: "15–20 km", max: 20, count: 0 }];
  for (const e of events) {
    if (e.k !== "R" || e.d === undefined || !inWindow(e, from, now.getTime())) continue;
    const b = bands.find((x) => e.d! <= x.max) ?? bands[bands.length - 1];
    b.count++;
  }
  return bands.map(({ label, count }) => ({ label, count }));
}

/** On lost bids: how far above the winning price the lab was, on average. null if never lost. */
export function priceGap(events: EventRow[], days: number, now = new Date()) {
  const from = now.getTime() - days * DAY;
  let n = 0, own = 0, win = 0;
  for (const e of events) {
    if (e.k !== "L" || e.a === undefined || e.c === undefined || !inWindow(e, from, now.getTime())) continue;
    n++; own += e.a; win += e.c;
  }
  if (!n) return null;
  const avgOwn = own / n, avgWin = win / n;
  return { lostBids: n, avgYourOffer: Math.round(avgOwn), avgWinningPrice: Math.round(avgWin), gapPct: Math.round(((avgOwn - avgWin) / avgWin) * 100) };
}

export function demandPoints(events: EventRow[], days: number, now = new Date()) {
  const from = now.getTime() - days * DAY;
  const m = new Map<string, { lat: number; lng: number; count: number }>();
  for (const e of events) {
    if (e.k !== "R" || e.la === undefined || e.ln === undefined || !inWindow(e, from, now.getTime())) continue;
    const k = `${e.la},${e.ln}`;
    const p = m.get(k) ?? { lat: e.la, lng: e.ln, count: 0 };
    p.count++; m.set(k, p);
  }
  return [...m.values()];
}

export function formatMinutes(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return h < 24 ? `${h.toFixed(h < 10 ? 1 : 0)} h` : `${Math.round(h / 24)} d`;
}
