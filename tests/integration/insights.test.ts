import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { acceptOffer, createRequest } from "@/lib/services/requests";
import { sendOffer } from "@/lib/services/lab-portal";
import { getLabActivity, getLabBranches, getLabEvents, getPatientInsights } from "@/lib/services/insights";
import { PATIENT_LOC, seedFixture } from "../helpers/fixtures";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); });
const offer = (price: number) => ({ totalPrice: price, homeCollectionAvailable: "on", reportTimeHours: 24 });

describe("lab activity events", () => {
  it("records a received event for every lab that gets a request, with distance and a coarse location", async () => {
    await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const near = await db.labEvent.findMany({ where: { laboratoryId: fx.near.lab.id } });
    expect(near).toHaveLength(1);
    expect(near[0]).toMatchObject({ type: "REQUEST_RECEIVED", approxLat: 19, approxLng: 72.8 });
    expect(near[0].distanceKm).toBeCloseTo(3, 0);
    expect(await db.labEvent.count({ where: { laboratoryId: fx.far.lab.id } })).toBe(0); // out of range
    expect(await db.labEvent.count()).toBe(3);
  });
  it("records the first offer once (with response time), not on edits", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await db.requestRecipient.updateMany({ where: { requestId: req.id, laboratoryId: fx.near.lab.id }, data: { createdAt: new Date(Date.now() - 45 * 60_000) } });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(850)); // edit
    const sent = await db.labEvent.findMany({ where: { laboratoryId: fx.near.lab.id, type: "OFFER_SENT" } });
    expect(sent).toHaveLength(1);
    expect(Number(sent[0].amount)).toBe(900);
    expect(sent[0].responseMinutes).toBeGreaterThanOrEqual(44);
    expect(sent[0].responseMinutes).toBeLessThanOrEqual(47);
    expect((await db.testRequest.findUniqueOrThrow({ where: { id: req.id } })).firstOfferAt).not.toBeNull();
  });
  it("keeps win/loss history (with the winning price) after the losing offers are deleted", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(1000));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer(800));
    await sendOffer(fx.branch.lab.id, fx.branch.owner.id, req.id, offer(1200));
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.edge.lab.id } })).id);
    expect(await db.offer.count({ where: { requestId: req.id } })).toBe(1); // losers deleted…
    const won = await db.labEvent.findFirstOrThrow({ where: { laboratoryId: fx.edge.lab.id, type: "OFFER_WON" } });
    expect(Number(won.amount)).toBe(800);
    const lost = await db.labEvent.findFirstOrThrow({ where: { laboratoryId: fx.branch.lab.id, type: "OFFER_LOST" } });
    expect([Number(lost.amount), Number(lost.competitorAmount)]).toEqual([1200, 800]); // …but the lesson is kept
    expect(await db.labEvent.count({ where: { type: { in: ["OFFER_WON", "OFFER_LOST"] } } })).toBe(3);
    const r = await db.testRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect([r.offersAtAccept, Number(r.highestOfferAtAccept)]).toEqual([3, 1200]);
  });
  it("events hold no patient content", async () => {
    await createRequest(fx.patient.id, { testIds: [fx.t1.id], notes: "secret note", customTests: ["Private Test"] });
    const json = JSON.stringify(await db.labEvent.findMany());
    for (const secret of ["secret note", "Private Test", "Asha", "9876543210", "12 Main Street"]) expect(json).not.toContain(secret);
  });
  it("returns the compact wire format and branches for the dashboard", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    const ev = await getLabEvents(fx.near.lab.id);
    expect(ev.map((e) => e.k)).toEqual(["R", "O"]);
    expect(ev[0]).toMatchObject({ la: 19, ln: 72.8 });
    expect(ev[1]).toMatchObject({ a: 900 });
    expect(typeof ev[0].t).toBe("string");
    expect(await getLabBranches(fx.branch.lab.id)).toHaveLength(2);
    expect((await getLabActivity(fx.near.lab.id))[0].type).toBe("OFFER_SENT");
    expect(await getLabEvents(fx.edge.lab.id, 0)).toEqual([]); // window respected
  });
});

describe("patient insights", () => {
  it("computes savings vs the highest offer, offers per request and time to first offer", async () => {
    const r1 = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, r1.id, offer(1000));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, r1.id, offer(700));
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: r1.id, laboratoryId: fx.edge.lab.id } })).id);
    const r2 = await createRequest(fx.patient.id, { testIds: [fx.t2.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, r2.id, offer(500));
    const i = await getPatientInsights(fx.patient.id, PATIENT_LOC);
    expect(i).toMatchObject({ totalRequests: 2, accepted: 1, open: 1, totalSaved: 300, avgOffersPerRequest: 1.5 });
    expect(i.savings).toHaveLength(1);
    expect(i.savings[0]).toMatchObject({ saved: 300, paid: 700, offers: 2 });
    expect(i.avgFirstOfferMin).toBeGreaterThanOrEqual(0);
    expect(i.weeks).toHaveLength(8);
    expect(i.weeks[7].count).toBe(2);
    expect(i.nearbyLabs.map((l) => l.name)).toEqual(["Near Lab", "Branch Lab", "Edge Lab"]);
  });
  it("is empty and safe for a brand-new patient with no address", async () => {
    const i = await getPatientInsights(fx.patient2.id, null);
    expect(i).toMatchObject({ totalRequests: 0, totalSaved: 0, avgOffersPerRequest: null, avgFirstOfferMin: null, nearbyLabs: [] });
  });
  it("never reports negative savings and ignores other patients' requests", async () => {
    const r = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, r.id, offer(900));
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: r.id } })).id);
    expect((await getPatientInsights(fx.patient.id, PATIENT_LOC)).totalSaved).toBe(0); // single offer → nothing saved
    expect((await getPatientInsights(fx.patient2.id, PATIENT_LOC)).totalRequests).toBe(0);
  });
});
