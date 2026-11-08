import { execFileSync } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb } from "../helpers/fixtures";

const run = (script: string, args: string[] = [], env: Record<string, string> = {}) =>
  execFileSync("npx", ["tsx", script, ...args], { env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const counts = async () => ({
  users: await db.user.count(), labs: await db.laboratory.count(), patients: await db.user.count({ where: { role: "PATIENT" } }),
  requests: await db.testRequest.count(), events: await db.labEvent.count(), offers: await db.offer.count(),
  tests: await db.diagnosticTest.count(), categories: await db.testCategory.count(),
});

beforeEach(async () => { await resetDb(); });

describe("dev seed: real-data only", () => {
  it("loads admin logins and the starter catalogue — and no labs, patients, requests, offers or activity", async () => {
    run("prisma/seed.ts");
    const c = await counts();
    expect(c).toMatchObject({ users: 2, labs: 0, patients: 0, requests: 0, events: 0, offers: 0, categories: 11 });
    expect(c.tests).toBeGreaterThanOrEqual(40);
    expect(await db.diagnosticTest.count({ where: { isDemo: true } })).toBe(0);
    // no invented clinical values
    expect(await db.diagnosticTest.count({ where: { OR: [{ turnaroundHours: { not: null } }, { sampleType: { not: null } }, { preparationInstructions: { not: null } }] } })).toBe(0);
    expect((await db.user.findMany({ select: { role: true } })).map((u) => u.role).sort()).toEqual(["ADMIN", "STAFF"]);
  }, 60_000);
  it("is idempotent and never deletes real data", async () => {
    run("prisma/seed.ts");
    const real = await db.user.create({ data: { name: "Real Patient", role: "PATIENT", email: "real@example.com" } });
    const lab = await db.laboratory.create({ data: { name: "Real Lab", slug: "real-lab", phone: "9000000000" } });
    const before = await counts();
    run("prisma/seed.ts");
    expect(await counts()).toEqual(before);
    expect(await db.user.findUnique({ where: { id: real.id } })).not.toBeNull();
    expect(await db.laboratory.findUnique({ where: { id: lab.id } })).not.toBeNull();
  }, 60_000);
  it("refuses to run in production", () => {
    expect(() => run("prisma/seed.ts", [], { NODE_ENV: "production" })).toThrow(/must not run in production/);
  }, 60_000);
});

describe("test fixtures stay in the test database", () => {
  it("seed-test refuses any database whose name doesn't contain _test (and wipes nothing)", async () => {
    await db.user.create({ data: { name: "Precious", role: "PATIENT", email: "precious@example.com" } });
    expect(() => run("prisma/seed-test.ts", [], { DATABASE_URL: "postgresql://ishaan@localhost:5432/diagnosearch" })).toThrow(/_test/);
    expect(await db.user.count({ where: { email: "precious@example.com" } })).toBe(1);
  }, 60_000);
});

describe("clean-demo script", () => {
  async function makeDemo() {
    const lab = await db.laboratory.create({ data: { name: "Fake Lab", slug: "fake-lab", phone: "9", isDemo: true } });
    await db.user.create({ data: { name: "Fake Owner", role: "LAB_OWNER", email: "fake-lab@diagnosearch.demo", laboratoryId: lab.id } });
    await db.user.create({ data: { name: "Fake Patient", role: "PATIENT", email: "demo.patient@diagnosearch.demo" } });
    await db.labEvent.create({ data: { laboratoryId: lab.id, type: "REQUEST_RECEIVED" } });
    const cat = await db.testCategory.create({ data: { name: "C", slug: "c" } });
    await db.diagnosticTest.create({ data: { name: "Fake Test", slug: "fake-test", categoryId: cat.id, isDemo: true } });
    const realLab = await db.laboratory.create({ data: { name: "Real Lab", slug: "real-lab", phone: "9" } });
    const real = await db.user.create({ data: { name: "Real Owner", role: "LAB_OWNER", email: "owner@reallab.com", laboratoryId: realLab.id } });
    await db.labEvent.create({ data: { laboratoryId: realLab.id, type: "OFFER_WON", amount: 500 } });
    return { realLab, real };
  }
  it("does nothing without --yes", async () => {
    await makeDemo();
    const before = await counts();
    run("scripts/clean-demo-data.ts");
    expect(await counts()).toEqual(before);
  }, 60_000);
  it("removes only the fictional data and keeps real accounts, labs and history", async () => {
    const { realLab, real } = await makeDemo();
    run("scripts/clean-demo-data.ts", ["--yes"]);
    expect(await db.laboratory.findMany({ select: { id: true } })).toEqual([{ id: realLab.id }]);
    expect((await db.user.findMany({ select: { id: true } })).map((u) => u.id)).toEqual([real.id]);
    expect(await db.labEvent.count()).toBe(1);
    expect(await db.diagnosticTest.count({ where: { isDemo: true } })).toBe(0);
  }, 60_000);
});

describe("local dev world (scripts/seed-local-data.ts)", () => {
  it("builds 5 patients, 20 labs across 4 cities and ~50 requests with believable, region-correct data", async () => {
    execFileSync("npx", ["tsx", "scripts/seed-local-data.ts"], { env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); // no --yes: must do nothing
    expect(await db.user.count()).toBe(0);
    run("scripts/seed-local-data.ts", ["--yes"]);

    // people & labs
    const patients = await db.user.findMany({ where: { role: "PATIENT" }, orderBy: { name: "asc" } });
    expect(patients.map((p) => [p.name, p.city])).toEqual([["Ishaan Gautam", "Ambala Cantt"], ["Kuldeep Sharma", "Deoband"], ["Riya Joshi", "Saharanpur"], ["Sandeep Sharma", "New Delhi"], ["Sushil Gautam", "Ambala Cantt"]]);
    const labs = await db.laboratory.findMany({ include: { addresses: true, owners: true } });
    expect(labs).toHaveLength(20);
    const byCity: Record<string, number> = {};
    for (const l of labs) byCity[l.addresses[0].city] = (byCity[l.addresses[0].city] ?? 0) + 1;
    expect(byCity).toEqual({ "Ambala Cantt": 5, "New Delhi": 6, Deoband: 4, Saharanpur: 5 });
    expect(labs.every((l) => l.isActive && l.approvalStatus === "APPROVED" && !l.isDemo && l.owners.length === 1 && l.addresses.every((a) => a.latitude && a.longitude))).toBe(true);
    expect(labs.filter((l) => l.verificationStatus === "VERIFIED").length).toBeGreaterThan(5);
    expect(new Set(labs.map((l) => l.slug)).size).toBe(20);

    // coordinates really are in the named cities (rough bounding boxes)
    const box: Record<string, [number, number, number, number]> = { "Ambala Cantt": [30.3, 30.45, 76.7, 76.85], "New Delhi": [28.45, 28.8, 77.0, 77.3], Deoband: [29.65, 29.74, 77.63, 77.72], Saharanpur: [29.92, 30.02, 77.5, 77.6] };
    for (const l of labs) { const a = l.addresses[0]; const [la0, la1, ln0, ln1] = box[a.city]; expect(a.latitude).toBeGreaterThan(la0); expect(a.latitude).toBeLessThan(la1); expect(a.longitude).toBeGreaterThan(ln0); expect(a.longitude).toBeLessThan(ln1); }

    // requests: many, varied outcomes
    const total = await db.testRequest.count();
    expect(total).toBeGreaterThanOrEqual(45);
    const status = Object.fromEntries((await db.testRequest.groupBy({ by: ["status"], _count: { _all: true } })).map((g) => [g.status, g._count._all]));
    expect(status.ACCEPTED).toBeGreaterThan(15);
    expect(status.OPEN).toBeGreaterThanOrEqual(5);
    expect(status.CANCELLED).toBeGreaterThan(0);
    expect(await db.prescriptionImage.count({ where: { requestId: { not: null } } })).toBeGreaterThan(5);
    expect(await db.chatMessage.count()).toBeGreaterThan(5); // losing labs' chats are deleted on accept, by design

    // the 20 km rule: a patient's requests only ever reach labs in their own region
    const region: Record<string, string> = { "Ambala Cantt": "Ambala Cantt", "New Delhi": "New Delhi", Deoband: "Deoband", Saharanpur: "Saharanpur" };
    const reqs = await db.testRequest.findMany({ include: { recipients: { include: { laboratory: { include: { addresses: true } } } } } });
    for (const r of reqs) for (const rec of r.recipients) { expect(rec.laboratory.addresses[0].city).toBe(region[r.city]); expect(rec.distanceKm).toBeLessThanOrEqual(20); }
    // open requests reached every lab in the region (4 in Deoband, 5 in Saharanpur, 5 in Ambala Cantt)
    const open = reqs.filter((r) => r.status === "OPEN" && r.service === "ANY");
    expect(open.length).toBeGreaterThan(0);
    for (const r of open) expect(r.recipients.length).toBe({ "Ambala Cantt": 5, "New Delhi": byCity["New Delhi"], Deoband: 4, Saharanpur: 5 }[r.city as "Deoband"]);

    // accepted requests keep the savings data; amounts are positive
    const accepted = await db.testRequest.findMany({ where: { status: "ACCEPTED" }, include: { offers: true } });
    for (const r of accepted) {
      expect(r.offers).toHaveLength(1);
      expect(r.offersAtAccept).toBeGreaterThanOrEqual(1);
      expect(Number(r.highestOfferAtAccept)).toBeGreaterThanOrEqual(Number(r.offers[0].totalPrice));
      expect(Number(r.offers[0].totalPrice)).toBeGreaterThan(0);
    }

    // history is spread over ~2.5 months and never in the future
    const oldest = await db.testRequest.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    expect(Date.now() - oldest.createdAt.getTime()).toBeGreaterThan(45 * 86_400_000);
    expect(await db.testRequest.count({ where: { createdAt: { gt: new Date() } } })).toBe(0);
    expect(await db.labEvent.count({ where: { createdAt: { gt: new Date() } } })).toBe(0);
    const kinds = Object.fromEntries((await db.labEvent.groupBy({ by: ["type"], _count: { _all: true } })).map((g) => [g.type, g._count._all]));
    expect(kinds.REQUEST_RECEIVED).toBeGreaterThan(100);
    expect(kinds.OFFER_SENT).toBeGreaterThan(100);
    expect(kinds.OFFER_WON).toBe(accepted.length);
    expect(kinds.OFFER_LOST).toBeGreaterThan(0);
    expect((await db.labEvent.findMany({ where: { type: "OFFER_SENT" }, select: { responseMinutes: true } })).every((e) => e.responseMinutes !== null && e.responseMinutes >= 5)).toBe(true);

    // every generated account can sign in with the documented passwords
    const { loginWithPassword } = await import("@/lib/services/accounts");
    for (const email of ["ishaan.gautam@example.com", "sandeep.sharma@example.com", "kuldeep.sharma@example.com", "riya.joshi@example.com", "sushil.gautam@example.com"]) {
      expect((await loginWithPassword(email, "Welcome@2026")).role).toBe("PATIENT");
    }
    expect((await loginWithPassword("9810000001", "Welcome@2026")).role).toBe("PATIENT"); // by mobile too
    const owners = await db.user.findMany({ where: { role: "LAB_OWNER" } });
    expect(owners).toHaveLength(20);
    for (const o of owners) expect((await loginWithPassword(o.email!, "LabLogin@2026")).role).toBe("LAB_OWNER");
  }, 180_000);
});
