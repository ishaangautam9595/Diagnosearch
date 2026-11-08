/** TEST-ONLY fixtures for the Playwright suite (fictional labs, patient, 120 days of activity). Never used by dev or production. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { slugify } from "../lib/utils";
import { CATEGORIES, LABS, TESTS } from "./seed-data";
import { createRequest, acceptOffer } from "../lib/services/requests";
import { sendOffer } from "../lib/services/lab-portal";
import { sendMessage } from "../lib/services/chat";

async function main() {
  // This seed WIPES every table and loads fictional data for the browser tests. It must only ever touch the test database.
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("seed-test only runs against a database whose name contains \"_test\".");
  console.log("Resetting the TEST database and loading test fixtures…");
  await db.$transaction([
    db.labEvent.deleteMany(), db.chatMessage.deleteMany(), db.offer.deleteMany(), db.requestRecipient.deleteMany(), db.prescriptionImage.deleteMany(),
    db.requestTest.deleteMany(), db.testRequest.deleteMany(), db.laboratoryAddress.deleteMany(), db.user.deleteMany(),
    db.laboratory.deleteMany(), db.diagnosticTest.deleteMany(), db.testCategory.deleteMany(),
    db.rateLimitHit.deleteMany(), db.auditLog.deleteMany(),
  ]);

  const hash = await bcrypt.hash("Admin@12345", 12);
  const demoHash = await bcrypt.hash("Demo@12345", 12); // patients & lab owners
  await db.user.createMany({ data: [
    { email: "admin@diagnosearch.demo", name: "Demo Admin", role: "ADMIN", passwordHash: hash },
    { email: "staff@diagnosearch.demo", name: "Demo Support Staff", role: "STAFF", passwordHash: hash },
  ] });

  const cats = new Map<string, string>();
  for (const [i, [name, description]] of CATEGORIES.entries()) cats.set(name, (await db.testCategory.create({ data: { name, slug: slugify(name), description, sortOrder: i } })).id);
  for (const [name, cat, sample, tat, pkg] of TESTS) {
    await db.diagnosticTest.create({ data: { name, slug: slugify(name), categoryId: cats.get(cat)!, sampleType: sample, turnaroundHours: tat, isPackage: pkg, isDemo: true } });
  }

  const labIds = new Map<string, string>();
  for (const p of LABS) {
    const slug = slugify(p.name);
    const lab = await db.laboratory.create({
      data: {
        name: p.name, slug, phone: p.phone, email: `${slug}@diagnosearch.demo`, contactPerson: "DEMO Owner", openingHours: p.hours, isDemo: true,
        description: "DEMO laboratory — fictional data for demonstration only.",
        accreditation: p.verified ? "DEMO: accreditation details placeholder (not a real certification)" : null,
        verificationStatus: p.verified ? "VERIFIED" : "UNVERIFIED", verifiedAt: p.verified ? new Date() : null, homeCollectionAvailable: p.home,
        addresses: { create: p.branches.map((b, i) => ({ label: b.label, line1: b.line1, city: p.name.startsWith("Delhi") ? "New Delhi" : "Bengaluru", pincode: b.pincode, latitude: b.lat, longitude: b.lng, isPrimary: i === 0 })) },
      },
    });
    await db.user.create({ data: { name: "DEMO Owner", role: "LAB_OWNER", email: `${slug}@diagnosearch.demo`, phone: p.phone, laboratoryId: lab.id, passwordHash: demoHash } });
    labIds.set(p.name, lab.id);
  }
  // A pending self-signup to demo the admin review queue.
  const pending = await db.laboratory.create({
    data: { name: "Sunrise Diagnostics (DEMO application)", slug: "sunrise-diagnostics-demo", phone: "9845000099", email: "owner@sunrise.demo", contactPerson: "DEMO Applicant", isDemo: true, isActive: false, approvalStatus: "PENDING", source: "SELF_SIGNUP",
      addresses: { create: { label: "Main", line1: "DEMO 22, Hosur Road", city: "Bengaluru", pincode: "560100", latitude: 12.85, longitude: 77.66 } } },
  });
  await db.user.create({ data: { name: "DEMO Applicant", role: "LAB_OWNER", email: "owner@sunrise.demo", phone: "9845000099", laboratoryId: pending.id, passwordHash: demoHash } });

  // Demo patient + requests created through the real services.
  const patient = await db.user.create({
    data: { name: "Rohan Mehta", role: "PATIENT", passwordHash: demoHash, email: "demo.patient@diagnosearch.demo", phone: "9876500001", addressLine: "DEMO 14, 4th Cross, Koramangala", city: "Bengaluru", pincode: "560034", latitude: 12.9352, longitude: 77.6245 },
  });
  const t = async (name: string) => (await db.diagnosticTest.findFirstOrThrow({ where: { name } })).id;
  const owner = async (labName: string) => db.user.findFirstOrThrow({ where: { laboratoryId: labIds.get(labName)! } });
  const offer = async (labName: string, requestId: string, price: number, note: string) => {
    const o = await owner(labName);
    await sendOffer(labIds.get(labName)!, o.id, requestId, { totalPrice: price, homeCollectionAvailable: "on", reportTimeHours: 24, note });
    return o;
  };

  const open = await createRequest(patient.id, { testIds: [await t("Complete Blood Count (CBC)"), await t("HbA1c (Glycated Hemoglobin)"), await t("Lipid Profile")], customTests: [], imageIds: [], notes: "DEMO: fasting sample preferred.", service: "ANY" });
  const aarogya = await offer("Aarogya Labs", open.id, 1180, "Free home collection. Reports by evening.");
  await offer("CityCare Diagnostics", open.id, 1290, "Includes a free consultation call.");
  await offer("WellNest Diagnostics", open.id, 1090, "Best price this week.");
  await sendMessage({ id: aarogya.id, role: "LAB_OWNER", laboratoryId: labIds.get("Aarogya Labs")! }, open.id, labIds.get("Aarogya Labs")!, "Hello! Happy to collect the sample tomorrow morning. Any preferred time?");
  await sendMessage({ id: patient.id, role: "PATIENT", laboratoryId: null }, open.id, labIds.get("Aarogya Labs")!, "Thanks! 8 AM works for me.");

  const done = await createRequest(patient.id, { testIds: [await t("Thyroid Profile (T3, T4, TSH)"), await t("Vitamin D (25-OH)")], customTests: [], imageIds: [], service: "ANY" });
  await offer("HealthFirst Pathology", done.id, 1450, "DEMO");
  await offer("CityCare Diagnostics", done.id, 1520, "DEMO");
  const accepted = await db.offer.findFirstOrThrow({ where: { requestId: done.id, laboratoryId: labIds.get("HealthFirst Pathology")! } });
  await acceptOffer(patient.id, accepted.id);


  // ── DEMO activity history (120 days) so the dashboards have something to visualise. Synthetic.
  let seedN = 7;
  const rnd = () => { seedN = (seedN * 1664525 + 1013904223) % 4294967296; return seedN / 4294967296; };
  const DAY = 86_400_000;
  for (const p of LABS.filter((l) => !l.name.startsWith("Delhi"))) {
    const labId = labIds.get(p.name)!;
    const base = 3 + rnd() * 7, offerRate = 0.62 + rnd() * 0.33, winRate = 0.18 + rnd() * 0.3, avgPrice = 800 + rnd() * 1400;
    const events: { laboratoryId: string; type: "REQUEST_RECEIVED" | "OFFER_SENT" | "OFFER_WON" | "OFFER_LOST"; amount?: number; competitorAmount?: number; distanceKm?: number; responseMinutes?: number; approxLat?: number; approxLng?: number; createdAt: Date }[] = [];
    const b = p.branches[0];
    for (let d = 120; d >= 1; d--) {
      const day = new Date(Date.now() - d * DAY);
      const weekday = day.getDay();
      const growth = 0.7 + ((120 - d) / 120) * 0.6; // activity grows over time
      const n = Math.max(0, Math.round((base * growth * (weekday === 0 ? 0.5 : weekday === 6 ? 0.8 : 1)) + (rnd() - 0.5) * 4));
      for (let i = 0; i < n; i++) {
        const t = new Date(day.getTime() - d * 0 + Math.floor(rnd() * DAY) - DAY / 2);
        const km = Math.round(Math.pow(rnd(), 0.8) * 19 * 10) / 10 + 0.3;
        const lat = b.lat + (rnd() - 0.5) * 0.28, lng = b.lng + (rnd() - 0.5) * 0.28;
        events.push({ laboratoryId: labId, type: "REQUEST_RECEIVED", distanceKm: km, approxLat: Math.round(lat * 100) / 100, approxLng: Math.round(lng * 100) / 100, createdAt: t });
        if (rnd() < offerRate) {
          const price = Math.round((avgPrice * (0.7 + rnd() * 0.7)) / 5) * 5;
          const resp = Math.round(8 + Math.pow(rnd(), 2.2) * 420);
          const sent = new Date(t.getTime() + resp * 60_000);
          events.push({ laboratoryId: labId, type: "OFFER_SENT", amount: price, responseMinutes: resp, createdAt: sent });
          if (d > 2 && rnd() < 0.8) {
            const decided = new Date(sent.getTime() + (1 + rnd() * 20) * 3_600_000);
            if (rnd() < winRate) events.push({ laboratoryId: labId, type: "OFFER_WON", amount: price, createdAt: decided });
            else events.push({ laboratoryId: labId, type: "OFFER_LOST", amount: price, competitorAmount: Math.round(price * (0.8 + rnd() * 0.17)), createdAt: decided });
          }
        }
      }
    }
    for (let i = 0; i < events.length; i += 1000) await db.labEvent.createMany({ data: events.slice(i, i + 1000) });
  }

  // ── DEMO past requests the patient already accepted (feeds the "you saved" insight).
  const past = [
    { days: 9, tests: ["Fasting Blood Sugar", "HbA1c (Glycated Hemoglobin)"], lab: "HealthFirst Pathology", paid: 520, highest: 790, offers: 4 },
    { days: 24, tests: ["Basic Health Checkup"], lab: "WellNest Diagnostics", paid: 1090, highest: 1640, offers: 5 },
    { days: 41, tests: ["Vitamin D (25-OH)", "Vitamin B12"], lab: "Aarogya Labs", paid: 1480, highest: 2050, offers: 3 },
    { days: 63, tests: ["Lipid Profile"], lab: "CityCare Diagnostics", paid: 430, highest: 640, offers: 4 },
  ];
  for (const [i, h] of past.entries()) {
    const created = new Date(Date.now() - h.days * DAY);
    await db.testRequest.create({
      data: {
        reference: `TR-DEMO${String(i + 1).padStart(4, "0")}`, patientId: patient.id, status: "ACCEPTED", service: "ANY", addressLine: "DEMO 14, 4th Cross, Koramangala", city: "Bengaluru", pincode: "560034",
        latitude: 12.9352, longitude: 77.6245, createdAt: created, acceptedAt: new Date(created.getTime() + 5 * 3_600_000), firstOfferAt: new Date(created.getTime() + (12 + i * 9) * 60_000),
        acceptedLabId: labIds.get(h.lab)!, offersAtAccept: h.offers, highestOfferAtAccept: h.highest,
        tests: { create: await Promise.all(h.tests.map(async (n) => ({ name: n, testId: await t(n) }))) },
        offers: { create: { laboratoryId: labIds.get(h.lab)!, totalPrice: h.paid, status: "ACCEPTED", homeCollectionAvailable: true, reportTimeHours: 24, createdAt: created } },
        recipients: { create: { laboratoryId: labIds.get(h.lab)!, distanceKm: 3 } },
      },
    });
  }

  console.log("Done.\n  Admin:   admin@diagnosearch.demo / Admin@12345\n  Patient: demo.patient@diagnosearch.demo / Demo@12345\n  Lab:     aarogya-labs@diagnosearch.demo / Demo@12345");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
