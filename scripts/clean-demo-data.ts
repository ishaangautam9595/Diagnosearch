import "dotenv/config";
import { db } from "../lib/db";

/**
 * Removes the fictional data that older versions of the seed created (demo labs, the demo patient and
 * their requests, synthetic activity history, flagged demo tests). Real accounts and real data are untouched.
 *
 *   npm run db:clean-demo            # show what would be deleted
 *   npm run db:clean-demo -- --yes   # actually delete it
 */
async function main() {
  const apply = process.argv.includes("--yes");
  const demoLabs = await db.laboratory.findMany({ where: { isDemo: true }, select: { id: true, name: true } });
  const demoUsers = await db.user.findMany({
    where: { OR: [{ email: { endsWith: "@diagnosearch.demo" }, role: { in: ["PATIENT", "LAB_OWNER"] } }, { email: { endsWith: "@sunrise.demo" } }, { laboratoryId: { in: demoLabs.map((l) => l.id) } }] },
    select: { id: true, email: true, role: true },
  });
  const demoTests = await db.diagnosticTest.count({ where: { isDemo: true } });
  const events = await db.labEvent.count({ where: { laboratoryId: { in: demoLabs.map((l) => l.id) } } });
  console.log(`Demo labs: ${demoLabs.length}\nDemo accounts: ${demoUsers.length}\nSynthetic activity rows: ${events}\nDemo-flagged catalogue tests: ${demoTests}`);
  if (!apply) { console.log("\nDry run. Re-run with --yes to delete."); return; }
  const userIds = demoUsers.map((u) => u.id);
  await db.$transaction(async (tx) => {
    await tx.testRequest.deleteMany({ where: { patientId: { in: userIds } } }); // cascades offers, chats, recipients, images
    await tx.laboratory.deleteMany({ where: { id: { in: demoLabs.map((l) => l.id) } } }); // cascades events, addresses, offers
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    await tx.diagnosticTest.deleteMany({ where: { isDemo: true } });
  });
  console.log("Done. Run `npm run db:seed` to (re)load the starter catalogue and admin logins.");
}
main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
