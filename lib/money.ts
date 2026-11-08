export function toPaise(value: number | string | { toString(): string }): number {
  return Math.round(Number(value.toString()) * 100);
}
export function formatINR(value: number | string | { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}

/** Short form for tiles: ₹950 · ₹12.4K · ₹3.2L · ₹1.5Cr (Indian grouping). */
export function formatCompactINR(n: number): string {
  const a = Math.abs(n);
  const f = (v: number, u: string) => `₹${(v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString()}${u}`;
  if (a >= 1e7) return f(n / 1e7, "Cr");
  if (a >= 1e5) return f(n / 1e5, "L");
  if (a >= 1e3) return f(n / 1e3, "K");
  return `₹${Math.round(n)}`;
}
