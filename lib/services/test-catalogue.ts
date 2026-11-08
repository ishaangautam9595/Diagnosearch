import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

export const CATALOGUE_TAG = "catalogue";
export const MAX_REQUEST_TESTS = 10;

export async function getCategories() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOGUE_TAG);
  const cats = await db.testCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, description: true, _count: { select: { tests: { where: { isActive: true } } } } },
  });
  return cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, testCount: c._count.tests }));
}

/** Lightweight search used by the debounced typeahead on the request form. */
export async function suggestTests(q: string, limit = 8) {
  const term = q.trim();
  if (term.length < 2) return [];
  return db.diagnosticTest.findMany({
    where: { isActive: true, category: { isActive: true }, name: { contains: term, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true, name: true, category: { select: { name: true } } },
  });
}
