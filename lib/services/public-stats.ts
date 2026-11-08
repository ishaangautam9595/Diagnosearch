import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

/** Real numbers for the landing page (nothing is invented). */
export async function getPublicStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");
  const [labs, tests, cities] = await Promise.all([
    db.laboratory.count({ where: { isActive: true, approvalStatus: "APPROVED" } }),
    db.diagnosticTest.count({ where: { isActive: true } }),
    db.laboratoryAddress.groupBy({ by: ["city"], where: { laboratory: { isActive: true, approvalStatus: "APPROVED" } } }),
  ]);
  return { labs, tests, cities: cities.length };
}

/** Approved, active labs for the sitemap. */
export async function listSitemapLabs() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  return db.laboratory.findMany({ where: { isActive: true, approvalStatus: "APPROVED" }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" } });
}
