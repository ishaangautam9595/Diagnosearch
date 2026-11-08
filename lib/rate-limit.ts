import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

/**
 * DB-backed sliding-window limiter (works across serverless instances).
 * Throws RATE_LIMITED when `limit` hits already exist inside the window; otherwise records a hit.
 */
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const since = new Date(Date.now() - windowMs);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) throw new AppError("Too many attempts. Please try again later.", "RATE_LIMITED");
  await db.rateLimitHit.create({ data: { key } });
  // opportunistic cleanup
  if (Math.random() < 0.02) await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
}
