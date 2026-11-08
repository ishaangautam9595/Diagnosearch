import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { slugify } from "../lib/utils";
import { CATEGORIES, TESTS } from "./catalogue";

/**
 * Development seed. Idempotent and NON-destructive: it only adds the admin logins and the starter test catalogue.
 * It creates no labs, patients, requests, offers or activity — all of that is real data entered through the app.
 * (Fictional fixtures live in prisma/seed-test.ts and are used only by the browser tests.)
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The dev seed has fixed admin passwords and must not run in production. Use `npm run create-admin` instead.");
  }
  const hash = await bcrypt.hash("Admin@12345", 12);
  for (const [email, name, role] of [["admin@diagnosearch.demo", "Admin", "ADMIN"], ["staff@diagnosearch.demo", "Support Staff", "STAFF"]] as const) {
    await db.user.upsert({ where: { email }, create: { email, name, role, passwordHash: hash }, update: {} });
  }
  const cats = new Map<string, string>();
  for (const [i, [name, description]] of CATEGORIES.entries()) {
    const slug = slugify(name);
    const c = await db.testCategory.upsert({ where: { slug }, create: { name, slug, description, sortOrder: i }, update: {} });
    cats.set(name, c.id);
  }
  for (const [name, cat, isPackage] of TESTS) {
    const slug = slugify(name);
    await db.diagnosticTest.upsert({ where: { slug }, create: { name, slug, categoryId: cats.get(cat)!, isPackage }, update: {} });
  }
  console.log(`Seeded admin logins, ${CATEGORIES.length} categories and ${TESTS.length} starter tests (existing data untouched).`);
  console.log("  Admin: admin@diagnosearch.demo / Admin@12345");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
