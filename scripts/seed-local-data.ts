import "dotenv/config";
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { db } from "../lib/db";
import { slugify } from "../lib/utils";
import { CATEGORIES, TESTS } from "../prisma/catalogue";
import { acceptOffer, cancelRequest, createRequest } from "../lib/services/requests";
import { sendOffer } from "../lib/services/lab-portal";
import { sendMessage } from "../lib/services/chat";
import { storePendingImage } from "../lib/services/prescriptions";

/**
 * LOCAL DEVELOPMENT DATA — wipes the database, then builds a realistic world through the app's own services:
 * 5 patients, 20 laboratories (Ambala Cantt, Delhi, Deoband, Saharanpur) and ~50 requests with offers, chats,
 * accepted/cancelled/open outcomes spread over the last ~75 days (so every dashboard has real history).
 *
 *   npx tsx scripts/seed-local-data.ts --yes
 *
 * Places, PIN codes and pin coordinates are real (approximate). Lab names are realistic but GENERIC — they are not real
 * businesses, and every phone number / email is a placeholder.
 */

const PATIENT_PASSWORD = "Welcome@2026";
const LAB_PASSWORD = "LabLogin@2026";
const DAY = 86_400_000;

// ───────── Patients ─────────
const PATIENTS = [
  { name: "Ishaan Gautam", email: "ishaan.gautam@example.com", phone: "9810000001", addressLine: "Nicholson Road, Ambala Cantt", city: "Ambala Cantt", pincode: "133001", lat: 30.3735, lng: 76.7775 },
  { name: "Sandeep Sharma", email: "sandeep.sharma@example.com", phone: "9810000002", addressLine: "Ajmal Khan Road, Karol Bagh, Delhi", city: "New Delhi", pincode: "110005", lat: 28.6519, lng: 77.1909 },
  { name: "Kuldeep Sharma", email: "kuldeep.sharma@example.com", phone: "9810000003", addressLine: "Gandhi Chowk, Deoband", city: "Deoband", pincode: "247554", lat: 29.6935, lng: 77.6775 },
  { name: "Riya Joshi", email: "riya.joshi@example.com", phone: "9810000004", addressLine: "Court Road, Saharanpur", city: "Saharanpur", pincode: "247001", lat: 29.9650, lng: 77.5470 },
  { name: "Sushil Gautam", email: "sushil.gautam@example.com", phone: "9810000005", addressLine: "Sadar Bazar, Ambala Cantt", city: "Ambala Cantt", pincode: "133001", lat: 30.3748, lng: 76.7698 },
];

// ───────── Laboratories (generic names; real localities) ─────────
interface LabDef { name: string; city: string; area: string; line1: string; pincode: string; lat: number; lng: number; verified: boolean; home: boolean; hours: string; price: number; reply: number }
const LABS: LabDef[] = [
  // Ambala Cantt (5)
  { name: "Sadar Bazar Pathology Lab", city: "Ambala Cantt", area: "Sadar Bazar", line1: "Shop 14, Sadar Bazar", pincode: "133001", lat: 30.3752, lng: 76.7702, verified: true, home: true, hours: "Mon–Sat 7:30 AM – 8:00 PM, Sun 8:00 AM – 1:00 PM", price: 0.9, reply: 0.9 },
  { name: "Nicholson Road Diagnostics", city: "Ambala Cantt", area: "Nicholson Road", line1: "12, Nicholson Road", pincode: "133001", lat: 30.3728, lng: 76.7791, verified: true, home: true, hours: "Daily 7:00 AM – 9:00 PM", price: 1.0, reply: 0.85 },
  { name: "Cantt Care Diagnostic Centre", city: "Ambala Cantt", area: "Mall Road", line1: "Near Mall Road Crossing", pincode: "133001", lat: 30.3801, lng: 76.7752, verified: false, home: false, hours: "Mon–Sat 8:00 AM – 7:00 PM", price: 0.85, reply: 0.7 },
  { name: "Shivalik Diagnostics", city: "Ambala Cantt", area: "Gandhi Nagar", line1: "Gandhi Nagar Main Road", pincode: "133001", lat: 30.3683, lng: 76.7846, verified: true, home: true, hours: "Mon–Sat 7:00 AM – 7:30 PM", price: 0.95, reply: 0.8 },
  { name: "Ambala Health Lab", city: "Ambala Cantt", area: "Baldev Nagar", line1: "Baldev Nagar Chowk", pincode: "133001", lat: 30.3848, lng: 76.7619, verified: false, home: true, hours: "Mon–Sun 7:30 AM – 6:30 PM", price: 0.88, reply: 0.65 },
  // Delhi (6)
  { name: "Karol Bagh Pathology Centre", city: "New Delhi", area: "Karol Bagh", line1: "Ajmal Khan Road, Karol Bagh", pincode: "110005", lat: 28.6445, lng: 77.1903, verified: true, home: true, hours: "Daily 6:30 AM – 9:00 PM", price: 1.1, reply: 0.9 },
  { name: "Lajpat Nagar Diagnostics", city: "New Delhi", area: "Lajpat Nagar", line1: "Central Market, Lajpat Nagar II", pincode: "110024", lat: 28.5677, lng: 77.2433, verified: true, home: true, hours: "Daily 7:00 AM – 9:00 PM", price: 1.12, reply: 0.85 },
  { name: "Connaught Place Health Lab", city: "New Delhi", area: "Connaught Place", line1: "Block F, Connaught Place", pincode: "110001", lat: 28.6315, lng: 77.2167, verified: true, home: false, hours: "Mon–Sat 8:00 AM – 8:00 PM", price: 1.2, reply: 0.8 },
  { name: "Saket Care Diagnostics", city: "New Delhi", area: "Saket", line1: "Press Enclave Road, Saket", pincode: "110017", lat: 28.5245, lng: 77.2066, verified: false, home: true, hours: "Daily 7:00 AM – 8:30 PM", price: 1.05, reply: 0.7 },
  { name: "Dwarka Pathology Lab", city: "New Delhi", area: "Dwarka", line1: "Sector 12, Dwarka", pincode: "110075", lat: 28.5921, lng: 77.046, verified: true, home: true, hours: "Mon–Sat 7:00 AM – 8:00 PM", price: 0.98, reply: 0.75 },
  { name: "Janakpuri Diagnostic Centre", city: "New Delhi", area: "Janakpuri", line1: "C-Block Market, Janakpuri", pincode: "110058", lat: 28.6219, lng: 77.0878, verified: false, home: true, hours: "Mon–Sun 7:30 AM – 8:00 PM", price: 1.0, reply: 0.8 },
  // Deoband (4)
  { name: "Deoband Diagnostic Centre", city: "Deoband", area: "Gandhi Chowk", line1: "Gandhi Chowk", pincode: "247554", lat: 29.6931, lng: 77.6779, verified: true, home: true, hours: "Mon–Sat 8:00 AM – 8:00 PM", price: 0.82, reply: 0.9 },
  { name: "Deoband City Pathology Lab", city: "Deoband", area: "Railway Road", line1: "Railway Road", pincode: "247554", lat: 29.6978, lng: 77.6724, verified: false, home: false, hours: "Mon–Sat 8:30 AM – 7:00 PM", price: 0.8, reply: 0.75 },
  { name: "Nanauta Road Health Lab", city: "Deoband", area: "Nanauta Road", line1: "Nanauta Road", pincode: "247554", lat: 29.6892, lng: 77.6851, verified: true, home: true, hours: "Daily 8:00 AM – 7:30 PM", price: 0.85, reply: 0.8 },
  { name: "Shiv Chowk Diagnostics", city: "Deoband", area: "Shiv Chowk", line1: "Shiv Chowk", pincode: "247554", lat: 29.6959, lng: 77.6832, verified: false, home: true, hours: "Mon–Sat 9:00 AM – 7:00 PM", price: 0.78, reply: 0.65 },
  // Saharanpur (5)
  { name: "Court Road Diagnostics", city: "Saharanpur", area: "Court Road", line1: "Court Road", pincode: "247001", lat: 29.9641, lng: 77.5466, verified: true, home: true, hours: "Mon–Sat 7:30 AM – 8:00 PM", price: 0.88, reply: 0.9 },
  { name: "Ambala Road Pathology Lab", city: "Saharanpur", area: "Ambala Road", line1: "Ambala Road", pincode: "247001", lat: 29.9798, lng: 77.5421, verified: true, home: false, hours: "Daily 8:00 AM – 7:30 PM", price: 0.9, reply: 0.8 },
  { name: "Saharanpur Health Care Lab", city: "Saharanpur", area: "Chilkana Road", line1: "Chilkana Road", pincode: "247001", lat: 29.9534, lng: 77.5588, verified: false, home: true, hours: "Mon–Sat 8:00 AM – 7:00 PM", price: 0.84, reply: 0.7 },
  { name: "Gandhi Road Diagnostics", city: "Saharanpur", area: "Gandhi Road", line1: "Gandhi Road", pincode: "247001", lat: 29.9702, lng: 77.5513, verified: true, home: true, hours: "Mon–Sun 7:30 AM – 8:00 PM", price: 0.92, reply: 0.85 },
  { name: "Shakti Nagar Pathology Lab", city: "Saharanpur", area: "Shakti Nagar", line1: "Shakti Nagar", pincode: "247001", lat: 29.9609, lng: 77.5372, verified: false, home: true, hours: "Mon–Sat 8:00 AM – 6:30 PM", price: 0.8, reply: 0.65 },
];

// Typical list prices (₹) used only to make the labs' offers plausible.
const BASE_PRICE: Record<string, number> = {
  "Complete Blood Count (CBC)": 350, "Erythrocyte Sedimentation Rate (ESR)": 150, Hemoglobin: 120, "Blood Group & Rh Typing": 200, "Dengue NS1 Antigen": 900, "Typhoid IgM (Typhidot)": 450, "C-Reactive Protein (CRP)": 450,
  "Fasting Blood Sugar": 100, "Postprandial Blood Sugar": 100, "HbA1c (Glycated Hemoglobin)": 450, "Urine Microalbumin": 400, "TSH (Thyroid Stimulating Hormone)": 300, "Free T3": 350, "Free T4": 350, "Thyroid Profile (T3, T4, TSH)": 550, "Anti-TPO Antibodies": 800,
  "Liver Function Test (LFT)": 600, "SGPT (ALT)": 180, "SGOT (AST)": 180, "Bilirubin (Total & Direct)": 200, "Kidney Function Test (KFT)": 650, "Serum Creatinine": 150, "Blood Urea": 150, "Uric Acid": 200, "Urine Routine & Microscopy": 150,
  "Lipid Profile": 500, "HDL Cholesterol": 200, "LDL Cholesterol (Direct)": 250, "Vitamin D (25-OH)": 1200, "Vitamin B12": 900, "Iron Studies": 900, "Serum Calcium": 200, Prolactin: 600, "Testosterone (Total)": 800, "Cortisol (Morning)": 700,
  "Troponin I": 1100, "hs-CRP (Cardiac Risk)": 700, "Basic Health Checkup": 999, "Comprehensive Full Body Checkup": 2499, "Chest X-Ray (PA View)": 450, "Ultrasound Abdomen": 1200,
};
const COMMON = ["Complete Blood Count (CBC)", "HbA1c (Glycated Hemoglobin)", "Lipid Profile", "TSH (Thyroid Stimulating Hormone)", "Vitamin D (25-OH)", "Vitamin B12", "Fasting Blood Sugar", "Liver Function Test (LFT)", "Kidney Function Test (KFT)", "Urine Routine & Microscopy", "Thyroid Profile (T3, T4, TSH)", "Basic Health Checkup"];
const CUSTOM = ["Serum Ferritin", "ANA Profile", "PSA (Total)", "Widal Test", "Stool Routine"];
const NOTES = ["Fasting sample preferred.", "Please call before arriving.", "Doctor advised these tests after fever.", "Routine yearly check-up.", "Need the report quickly.", "Elderly patient — home collection would help."];
const OPENERS = ["Hello! Happy to help with this. Any preferred time for the sample?", "Hi, we can do this today. Is fasting done?", "Namaste! We offer free home collection in your area.", "Hello, reports will be on WhatsApp the same evening."];
const REPLIES = ["Morning around 8 AM works for me.", "Yes, I'm fasting since last night.", "Great, please go ahead.", "Can you confirm the final price?", "Thank you, that works."];

function prng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = prng(20260507);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** A simple prescription-style image listing the tests advised (no drugs / no doctor names). */
async function prescriptionImage(patient: string, tests: string[], date: Date) {
  const lines = tests.map((t, i) => `<text x="70" y="${330 + i * 56}" font-size="30" fill="#1f2937">${i + 1}. ${t.replace(/&/g, "and")}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#fffef9"/><rect x="30" y="30" width="840" height="1140" fill="none" stroke="#cbd5e1" stroke-width="3"/>
  <text x="70" y="110" font-size="44" font-weight="700" fill="#0f766e" font-family="sans-serif">Rx — Investigations advised</text><line x1="70" y1="140" x2="830" y2="140" stroke="#0f766e" stroke-width="3"/>
  <text x="70" y="210" font-size="30" fill="#334155" font-family="sans-serif">Patient: ${patient}</text><text x="70" y="256" font-size="30" fill="#334155" font-family="sans-serif">Date: ${date.toISOString().slice(0, 10)}</text>
  <g font-family="sans-serif">${lines}</g><text x="70" y="1090" font-size="24" fill="#94a3b8" font-family="sans-serif">Sample prescription image</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function wipe() {
  await db.$transaction([
    db.labEvent.deleteMany(), db.chatMessage.deleteMany(), db.offer.deleteMany(), db.requestRecipient.deleteMany(), db.prescriptionImage.deleteMany(),
    db.requestTest.deleteMany(), db.testRequest.deleteMany(), db.laboratoryAddress.deleteMany(), db.user.deleteMany(), db.laboratory.deleteMany(),
    db.diagnosticTest.deleteMany(), db.testCategory.deleteMany(), db.rateLimitHit.deleteMany(), db.auditLog.deleteMany(), db.setting.deleteMany(),
  ]);
}

async function shiftRequest(requestId: string, t0: Date, t1: Date, shiftMs: number) {
  const iv = (col: string) => `"${col}" - (${shiftMs} * interval '1 millisecond')`;
  await db.$transaction([
    db.$executeRawUnsafe(`UPDATE "TestRequest" SET "createdAt" = ${iv("createdAt")}, "updatedAt" = ${iv("updatedAt")}, "acceptedAt" = ${iv("acceptedAt")}, "firstOfferAt" = ${iv("firstOfferAt")} WHERE id = '${requestId}'::uuid`),
    db.$executeRawUnsafe(`UPDATE "RequestRecipient" SET "createdAt" = ${iv("createdAt")} WHERE "requestId" = '${requestId}'::uuid`),
    db.$executeRawUnsafe(`UPDATE "Offer" SET "createdAt" = ${iv("createdAt")}, "updatedAt" = ${iv("updatedAt")} WHERE "requestId" = '${requestId}'::uuid`),
    db.$executeRawUnsafe(`UPDATE "ChatMessage" SET "createdAt" = ${iv("createdAt")} WHERE "requestId" = '${requestId}'::uuid`),
    db.$executeRawUnsafe(`UPDATE "PrescriptionImage" SET "createdAt" = ${iv("createdAt")} WHERE "requestId" = '${requestId}'::uuid`),
    db.$executeRawUnsafe(`UPDATE "LabEvent" SET "createdAt" = ${iv("createdAt")} WHERE "createdAt" BETWEEN '${t0.toISOString()}' AND '${t1.toISOString()}'`),
    db.$executeRawUnsafe(`UPDATE "AuditLog" SET "createdAt" = ${iv("createdAt")} WHERE "createdAt" BETWEEN '${t0.toISOString()}' AND '${t1.toISOString()}'`),
  ]);
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production.");
  if (!process.argv.includes("--yes")) {
    console.log("This WIPES the database in DATABASE_URL and loads 5 patients, 20 labs and ~50 requests.\nRe-run with --yes to continue.");
    return;
  }
  const t = Date.now();
  console.log("Wiping existing data…");
  await wipe();

  const adminHash = await bcrypt.hash("Admin@12345", 12);
  const patientHash = await bcrypt.hash(PATIENT_PASSWORD, 10);
  const labHash = await bcrypt.hash(LAB_PASSWORD, 10);
  await db.user.createMany({ data: [
    { email: "admin@diagnosearch.demo", name: "Admin", role: "ADMIN", passwordHash: adminHash },
    { email: "staff@diagnosearch.demo", name: "Support Staff", role: "STAFF", passwordHash: adminHash },
  ] });

  console.log("Loading the test catalogue…");
  const cats = new Map<string, string>();
  for (const [i, [name, description]] of CATEGORIES.entries()) cats.set(name, (await db.testCategory.create({ data: { name, slug: slugify(name), description, sortOrder: i } })).id);
  for (const [name, cat, isPackage] of TESTS) await db.diagnosticTest.create({ data: { name, slug: slugify(name), categoryId: cats.get(cat)!, isPackage } });
  const allTests = await db.diagnosticTest.findMany({ select: { id: true, name: true } });
  const testByName = new Map(allTests.map((x) => [x.name, x.id]));

  console.log("Creating 20 laboratories…");
  const labs: { def: LabDef; id: string; ownerId: string; email: string; phone: string }[] = [];
  for (const [i, def] of LABS.entries()) {
    const slug = slugify(def.name);
    const phone = `98110${String(i + 1).padStart(5, "0")}`;
    const email = `${slug}@example.com`;
    const lab = await db.laboratory.create({
      data: {
        name: def.name, slug, phone, whatsapp: phone, email, contactPerson: "Lab Manager", openingHours: def.hours, homeCollectionAvailable: def.home,
        description: `Diagnostic laboratory in ${def.area}, ${def.city}.`, verificationStatus: def.verified ? "VERIFIED" : "UNVERIFIED", verifiedAt: def.verified ? new Date() : null,
        addresses: { create: { label: "Main branch", line1: def.line1, city: def.city, pincode: def.pincode, latitude: def.lat, longitude: def.lng, isPrimary: true } },
      },
    });
    const owner = await db.user.create({ data: { name: `${def.name} Manager`, role: "LAB_OWNER", email, phone, laboratoryId: lab.id, passwordHash: labHash } });
    labs.push({ def, id: lab.id, ownerId: owner.id, email, phone });
  }

  console.log("Creating 5 patients…");
  const patients = [];
  for (const p of PATIENTS) {
    const u = await db.user.create({ data: { name: p.name, role: "PATIENT", email: p.email, phone: p.phone, passwordHash: patientHash, addressLine: p.addressLine, city: p.city, pincode: p.pincode, latitude: p.lat, longitude: p.lng } });
    patients.push({ ...p, id: u.id });
  }

  console.log("Creating requests, offers, chats and outcomes (through the app's services)…");
  const counts = [10, 11, 10, 9, 10]; // ≈ 50
  const stats = { requests: 0, offers: 0, accepted: 0, cancelled: 0, open: 0, noLabs: 0, messages: 0, images: 0 };
  for (const [pi, p] of patients.entries()) {
    const n = counts[pi];
    for (let k = 0; k < n; k++) {
      const recent = k >= n - 2; // the two newest per patient stay open
      const daysAgo = recent ? rnd() * 2.2 : 3 + ((n - 3 - k) / (n - 3)) * 70 + rnd() * 3;
      const t0 = new Date();
      // tests (+ sometimes a custom one, sometimes a prescription image)
      const names = [...new Set(Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => pick(COMMON)))];
      const testIds = names.map((x) => testByName.get(x)!);
      const customTests = chance(0.12) ? [pick(CUSTOM)] : [];
      const imageIds: string[] = [];
      if (chance(0.3)) {
        const img = await storePendingImage(p.id, await prescriptionImage(p.name, [...names, ...customTests], new Date(t0.getTime() - daysAgo * DAY)));
        imageIds.push(img.id); stats.images++;
      }
      const service = pick(["ANY", "ANY", "ANY", "HOME_COLLECTION", "WALK_IN"] as const);
      const req = await createRequest(p.id, { testIds: chance(0.85) || imageIds.length === 0 ? testIds : [], customTests, imageIds, notes: chance(0.35) ? pick(NOTES) : "", service });
      stats.requests++;
      const recips = await db.requestRecipient.findMany({ where: { requestId: req.id }, select: { laboratoryId: true } });
      if (!recips.length) stats.noLabs++;

      const base = names.reduce((a, x) => a + (BASE_PRICE[x] ?? 300), 0) + customTests.length * 450;
      const offered: { labId: string; ownerId: string; price: number; resp: number }[] = [];
      for (const r of recips) {
        const lab = labs.find((l) => l.id === r.laboratoryId)!;
        if (!chance(lab.def.reply)) continue;
        const resp = Math.round(6 + Math.pow(rnd(), 2) * 360);
        await db.requestRecipient.updateMany({ where: { requestId: req.id, laboratoryId: lab.id }, data: { createdAt: new Date(Date.now() - resp * 60_000) } });
        const price = round5(base * lab.def.price * (0.93 + rnd() * 0.14) + (lab.def.home && service === "HOME_COLLECTION" ? 0 : 0));
        await sendOffer(lab.id, lab.ownerId, req.id, { totalPrice: price, homeCollectionAvailable: lab.def.home ? "on" : "", reportTimeHours: pick([12, 24, 24, 48]), note: chance(0.5) ? pick(["Free home collection.", "Reports on WhatsApp.", "Best price for this combination.", "Open all days."]) : "" });
        offered.push({ labId: lab.id, ownerId: lab.ownerId, price, resp }); stats.offers++;
      }
      // a short chat with one lab that replied
      if (offered.length && chance(0.45)) {
        const o = pick(offered);
        const msgs: [boolean, string][] = [[false, pick(OPENERS)], [true, pick(REPLIES)], [false, "Sure, noted."]];
        for (const [fromPatient, body] of msgs.slice(0, 2 + Math.floor(rnd() * 2))) {
          await sendMessage(fromPatient ? { id: p.id, role: "PATIENT", laboratoryId: null } : { id: o.ownerId, role: "LAB_OWNER", laboratoryId: o.labId }, req.id, o.labId, body);
          stats.messages++;
        }
      }
      // outcome
      if (!recent) {
        if (offered.length === 0 || chance(0.12)) { await cancelRequest(p.id, req.id); stats.cancelled++; }
        else {
          const sorted = [...offered].sort((a, b) => a.price - b.price);
          const chosen = chance(0.65) ? sorted[0] : pick(offered);
          const offer = await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: chosen.labId } });
          await acceptOffer(p.id, offer.id); stats.accepted++;
        }
      } else stats.open++;
      const t1 = new Date();
      await shiftRequest(req.id, t0, t1, Math.round(daysAgo * DAY));
      // make offer / first-offer / acceptance timestamps agree with each lab's response time (minutes after the request)
      for (const o of offered) {
        await db.$executeRawUnsafe(`UPDATE "Offer" SET "createdAt" = r."createdAt" + (${o.resp} * interval '1 minute'), "updatedAt" = r."createdAt" + (${o.resp} * interval '1 minute') FROM "TestRequest" r WHERE "Offer"."requestId" = r.id AND r.id = '${req.id}'::uuid AND "Offer"."laboratoryId" = '${o.labId}'::uuid`);
      }
      if (offered.length) {
        const first = Math.min(...offered.map((o) => o.resp));
        await db.$executeRawUnsafe(`UPDATE "TestRequest" SET "firstOfferAt" = "createdAt" + (${first} * interval '1 minute'), "acceptedAt" = CASE WHEN "acceptedAt" IS NULL THEN NULL ELSE "createdAt" + (${first + 30 + Math.floor(rnd() * 900)} * interval '1 minute') END WHERE id = '${req.id}'::uuid`);
      }
    }
  }

  // ───────── Logins file (git-ignored) + console summary ─────────
  const lines: string[] = [];
  lines.push("# Local login credentials (generated — git-ignored)\n", "## Admin  (/admin/login)", "- admin@diagnosearch.demo / Admin@12345", "- staff@diagnosearch.demo / Admin@12345\n");
  lines.push(`## Patients  (/login) — password for all: ${PATIENT_PASSWORD}`, "| Name | Email | Mobile | Location |", "|---|---|---|---|");
  for (const p of PATIENTS) lines.push(`| ${p.name} | ${p.email} | ${p.phone} | ${p.addressLine} |`);
  lines.push("", `## Labs  (/login) — password for all: ${LAB_PASSWORD}`, "| Laboratory | City | Email | Mobile |", "|---|---|---|---|");
  for (const l of labs) lines.push(`| ${l.def.name} | ${l.def.city} | ${l.email} | ${l.phone} |`);
  writeFileSync(".local-logins.md", lines.join("\n") + "\n");

  const [ev, rq] = await Promise.all([db.labEvent.count(), db.testRequest.groupBy({ by: ["status"], _count: { _all: true } })]);
  console.log(`\nDone in ${Math.round((Date.now() - t) / 1000)}s.`);
  console.log(`Requests: ${stats.requests} (${rq.map((r) => `${r.status.toLowerCase()} ${r._count._all}`).join(", ")}) · offers sent: ${stats.offers} · chat messages: ${stats.messages} · prescription images: ${stats.images} · activity events: ${ev}`);
  console.log("\n" + lines.join("\n"));
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
