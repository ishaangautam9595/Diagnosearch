import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { acceptOffer, cancelRequest, createRequest, findLabsInRadius, getPatientRequest, listPatientRequests } from "@/lib/services/requests";
import { getLabRequest, listLabRequests, sendOffer, getLabOverview } from "@/lib/services/lab-portal";
import { canViewImage, chatAccess, listMessages, sendMessage } from "@/lib/services/chat";
import { optimiseImage, storePendingImage } from "@/lib/services/prescriptions";
import { actorOf, makeImage, PATIENT_LOC, seedFixture } from "../helpers/fixtures";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); });

const offer = (price = 500, extra: Record<string, unknown> = {}) => ({ totalPrice: price, homeCollectionAvailable: "on", reportTimeHours: 24, note: "Best price", ...extra });
const labOf = (l: Fx["near"]) => ({ labId: l.lab.id, userId: l.owner.id });

describe("radius matching (20 km)", () => {
  it("includes approved, active labs within 20 km — by their nearest branch — and nothing else", async () => {
    const r = await findLabsInRadius(db, PATIENT_LOC.lat, PATIENT_LOC.lng);
    expect(r.map((x) => x.id)).toEqual([fx.near.lab.id, fx.branch.lab.id, fx.edge.lab.id]); // nearest first
    expect(r.find((x) => x.id === fx.near.lab.id)!.distanceKm).toBeCloseTo(3, 0);
    expect(r.find((x) => x.id === fx.branch.lab.id)!.distanceKm).toBeCloseTo(5, 0); // second branch
    const ids = r.map((x) => x.id);
    for (const excluded of [fx.far, fx.pending, fx.inactive]) expect(ids).not.toContain(excluded.lab.id);
  });
  it("can be limited to labs that offer home collection", async () => {
    const r = await findLabsInRadius(db, PATIENT_LOC.lat, PATIENT_LOC.lng, 20, "HOME_COLLECTION");
    expect(r.map((x) => x.id)).toEqual([fx.near.lab.id]);
  });
});

describe("creating a request", () => {
  it("sends the request to every lab within 20 km and stores tests as relations", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id], customTests: ["Special Marker"], notes: "Fasting", service: "ANY" });
    expect(req.reference).toMatch(/^TR-[A-Z0-9]{8}$/);
    expect(req.labsNotified).toBe(3);
    const row = await db.testRequest.findUniqueOrThrow({ where: { id: req.id }, include: { tests: true, recipients: true } });
    expect(row).toMatchObject({ status: "OPEN", radiusKm: 20, addressLine: "12 Main Street", latitude: PATIENT_LOC.lat });
    expect(row.tests.map((t) => [t.name, t.testId !== null]).sort()).toEqual([["Complete Blood Count", true], ["Special Marker", false]]);
    expect(row.recipients.map((r) => r.laboratoryId).sort()).toEqual([fx.near.lab.id, fx.edge.lab.id, fx.branch.lab.id].sort());
  });
  it("requires a prescription or tests, valid catalogue tests, a pinned address, and only for patients", async () => {
    await expect(createRequest(fx.patient.id, {})).rejects.toThrow(/prescription or add at least one test/i);
    await expect(createRequest(fx.patient.id, { testIds: [fx.inactiveTest.id] })).rejects.toThrow(/no longer available/i);
    await expect(createRequest(fx.patient.id, { customTests: ["a"] })).rejects.toThrow();
    await expect(createRequest(fx.patient.id, { testIds: Array.from({ length: 11 }, () => fx.t1.id) })).rejects.toThrow();
    await db.user.update({ where: { id: fx.patient2.id }, data: { latitude: null, longitude: null } });
    await expect(createRequest(fx.patient2.id, { testIds: [fx.t1.id] })).rejects.toThrow(/address with a map pin/i);
    await expect(createRequest(fx.near.owner.id, { testIds: [fx.t1.id] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.testRequest.count()).toBe(0);
  });
  it("attaches the patient's own uploaded prescription, and refuses someone else's", async () => {
    const img = await storePendingImage(fx.patient.id, await makeImage(800, 600));
    const other = await storePendingImage(fx.patient2.id, await makeImage(200, 200));
    await expect(createRequest(fx.patient.id, { imageIds: [other.id] })).rejects.toThrow(/expired/i);
    const req = await createRequest(fx.patient.id, { imageIds: [img.id] });
    expect((await db.prescriptionImage.findUniqueOrThrow({ where: { id: img.id } })).requestId).toBe(req.id);
  });
  it("still works (open, zero recipients) when no lab is nearby", async () => {
    await db.user.update({ where: { id: fx.patient2.id }, data: { latitude: 10, longitude: 10 } });
    const req = await createRequest(fx.patient2.id, { testIds: [fx.t1.id] });
    expect(req.labsNotified).toBe(0);
  });
  it("rate limits request creation", async () => {
    for (let i = 0; i < 15; i++) await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await expect(createRequest(fx.patient.id, { testIds: [fx.t1.id] })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("lab view & offers", () => {
  it("shows labs only requests they received, and hides patient identity until accepted", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const view = (await getLabRequest(fx.near.lab.id, req.id))!;
    expect(view.patient).toMatchObject({ revealed: false, name: "Asha", phone: null, email: null });
    expect(view.patient.address).not.toContain("Main Street");
    expect(await getLabRequest(fx.far.lab.id, req.id)).toBeNull();
    expect(await getLabRequest(fx.pending.lab.id, req.id)).toBeNull();
    expect((await listLabRequests(fx.far.lab.id, "all")).length).toBe(0);
    expect((await listLabRequests(fx.near.lab.id, "new")).map((r) => r.id)).toEqual([req.id]);
  });
  it("sends, updates and validates offers; marks the request as seen", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const { labId, userId } = labOf(fx.near);
    expect((await db.requestRecipient.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: labId } })).firstSeenAt).toBeNull();
    await getLabRequest(labId, req.id); // opening the request marks it seen
    const o1 = await sendOffer(labId, userId, req.id, offer(900));
    const o2 = await sendOffer(labId, userId, req.id, offer(750, { note: "Lowered" }));
    expect(o2.id).toBe(o1.id); // one offer per lab, updated in place
    expect(Number(o2.totalPrice)).toBe(750);
    expect((await listLabRequests(labId, "quoted")).length).toBe(1);
    expect((await db.requestRecipient.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: labId } })).firstSeenAt).not.toBeNull();
    for (const bad of [0, -5, "abc", 2_000_000]) await expect(sendOffer(labId, userId, req.id, offer(bad as number))).rejects.toThrow();
  });
  it("only approved, active labs that received the request may quote", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await expect(sendOffer(fx.far.lab.id, fx.far.owner.id, req.id, offer())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(sendOffer(fx.pending.lab.id, fx.pending.owner.id, req.id, offer())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("shows the patient offers lowest first", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer(600));
    await sendOffer(fx.branch.lab.id, fx.branch.owner.id, req.id, offer(750));
    const d = (await getPatientRequest(fx.patient.id, req.id))!;
    expect(d.offers.map((o) => o.totalPrice)).toEqual([600, 750, 900]);
    expect(await getPatientRequest(fx.patient2.id, req.id)).toBeNull(); // not theirs
    const list = await listPatientRequests(fx.patient.id);
    expect(list[0]).toMatchObject({ lowest: 600, _count: { offers: 3 } });
  });
});

describe("patient location shown to labs", () => {
  it("shares only an approximate point (~1 km) before acceptance and the exact pin with the winner", async () => {
    await db.user.update({ where: { id: fx.patient.id }, data: { latitude: 19.00494, longitude: 72.80371 } });
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const before = (await getLabRequest(fx.near.lab.id, req.id))!;
    expect(before.location).toEqual({ lat: 19, lng: 72.8, exact: false }); // rounded to 2 decimals
    expect(JSON.stringify(before)).not.toContain("19.00494");
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer(950));
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.near.lab.id } })).id);
    expect((await getLabRequest(fx.near.lab.id, req.id))!.location).toEqual({ lat: 19.00494, lng: 72.80371, exact: true });
    expect(await getLabRequest(fx.edge.lab.id, req.id)).toBeNull(); // losers see nothing at all
  });
  it("lists the lab's branches with distance to the patient and flags the nearest", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const v = (await getLabRequest(fx.branch.lab.id, req.id))!;
    expect(v.branches).toHaveLength(2);
    const nearest = v.branches.filter((b) => b.nearest);
    expect(nearest).toHaveLength(1);
    expect(nearest[0].name).toBe("2 Lab Road"); // the branch ≈5 km away, not the one ≈85 km away
    expect(nearest[0].km).toBeCloseTo(5, 0);
    expect(v.branches.find((b) => !b.nearest)!.km).toBeGreaterThan(50);
    expect(v.distanceKm).toBeCloseTo(nearest[0].km, 0); // matches the distance stored when the request was sent
  });
});

describe("accepting an offer", () => {
  async function scenario() {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const labs = [fx.near, fx.edge, fx.branch];
    for (const [i, l] of labs.entries()) {
      await sendOffer(l.lab.id, l.owner.id, req.id, offer(1000 - i * 100));
      await sendMessage(actorOf({ id: l.owner.id, role: "LAB_OWNER", laboratoryId: l.lab.id }), req.id, l.lab.id, `hello from ${l.lab.name}`);
      await sendMessage(actorOf(fx.patient), req.id, l.lab.id, `hi ${l.lab.name}`);
    }
    return req;
  }
  it("closes the request and deletes every other offer, chat and recipient — keeping the winner's", async () => {
    const req = await scenario();
    const winning = await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.edge.lab.id } });
    const res = await acceptOffer(fx.patient.id, winning.id);
    expect(res).toMatchObject({ requestId: req.id, laboratoryId: fx.edge.lab.id, discardedOffers: 2 });
    const row = await db.testRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(row).toMatchObject({ status: "ACCEPTED", acceptedLabId: fx.edge.lab.id, acceptedOfferId: winning.id });
    expect((await db.offer.findMany({ where: { requestId: req.id } })).map((o) => [o.laboratoryId, o.status])).toEqual([[fx.edge.lab.id, "ACCEPTED"]]);
    expect((await db.chatMessage.findMany({ where: { requestId: req.id } })).every((m) => m.laboratoryId === fx.edge.lab.id)).toBe(true);
    expect(await db.chatMessage.count({ where: { requestId: req.id } })).toBe(2);
    expect((await db.requestRecipient.findMany({ where: { requestId: req.id } })).map((r) => r.laboratoryId)).toEqual([fx.edge.lab.id]);
    // losers lose access completely
    expect(await getLabRequest(fx.near.lab.id, req.id)).toBeNull();
    await expect(sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer())).rejects.toBeTruthy();
    expect((await chatAccess(actorOf({ id: fx.near.owner.id, role: "LAB_OWNER", laboratoryId: fx.near.lab.id }), req.id, fx.near.lab.id)).canRead).toBe(false);
  });
  it("reveals the patient's details to the winner only", async () => {
    const req = await scenario();
    const winning = await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.branch.lab.id } });
    await acceptOffer(fx.patient.id, winning.id);
    const view = (await getLabRequest(fx.branch.lab.id, req.id))!;
    expect(view.patient).toMatchObject({ revealed: true, name: "Asha Verma", phone: "9876543210", address: "12 Main Street, Testville 400001" });
    expect(view.wonByMe).toBe(true);
    const ov = await getLabOverview(fx.branch.lab.id);
    expect(ov).toMatchObject({ won: 1, wonValue: 800 });
  });
  it("the winner can keep chatting after acceptance; nobody else can", async () => {
    const req = await scenario();
    const winning = await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.near.lab.id } });
    await acceptOffer(fx.patient.id, winning.id);
    const lab = actorOf({ id: fx.near.owner.id, role: "LAB_OWNER", laboratoryId: fx.near.lab.id });
    await sendMessage(lab, req.id, fx.near.lab.id, "See you tomorrow");
    expect((await listMessages(actorOf(fx.patient), req.id, fx.near.lab.id)).messages.at(-1)!.body).toBe("See you tomorrow");
    await expect(sendMessage(actorOf(fx.patient), req.id, fx.edge.lab.id, "hello?")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("can't be accepted twice, by another patient, or after cancelling; a new request is allowed afterwards", async () => {
    const req = await scenario();
    const [a, b] = await db.offer.findMany({ where: { requestId: req.id }, orderBy: { totalPrice: "asc" } });
    await expect(acceptOffer(fx.patient2.id, a.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const results = await Promise.allSettled([acceptOffer(fx.patient.id, a.id), acceptOffer(fx.patient.id, b.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); // concurrent accepts: exactly one wins
    await expect(acceptOffer(fx.patient.id, a.id)).rejects.toBeTruthy();
    await expect(cancelRequest(fx.patient.id, req.id)).rejects.toMatchObject({ code: "CONFLICT" });
    const next = await createRequest(fx.patient.id, { testIds: [fx.t2.id] });
    expect(next.labsNotified).toBe(3);
  });
  it("cancelling deletes offers, chats, recipients and prescription images", async () => {
    const img = await storePendingImage(fx.patient.id, await makeImage(300, 300));
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id], imageIds: [img.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer());
    await sendMessage(actorOf(fx.patient), req.id, fx.near.lab.id, "hi");
    await cancelRequest(fx.patient.id, req.id);
    expect(await db.offer.count({ where: { requestId: req.id } })).toBe(0);
    expect(await db.chatMessage.count({ where: { requestId: req.id } })).toBe(0);
    expect(await db.requestRecipient.count({ where: { requestId: req.id } })).toBe(0);
    expect(await db.prescriptionImage.count({ where: { requestId: req.id } })).toBe(0);
    expect((await db.testRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("CANCELLED");
    await expect(sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer())).rejects.toBeTruthy();
  });
});

describe("chat permissions", () => {
  it("lets only the patient and the receiving lab talk; admins may read but not write", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    const lab = (l: Fx["near"]) => actorOf({ id: l.owner.id, role: "LAB_OWNER", laboratoryId: l.lab.id });
    await sendMessage(actorOf(fx.patient), req.id, fx.near.lab.id, "Hello");
    await sendMessage(lab(fx.near), req.id, fx.near.lab.id, "Hi!");
    expect((await listMessages(actorOf(fx.patient), req.id, fx.near.lab.id)).messages.map((m) => [m.sender, m.body])).toEqual([["PATIENT", "Hello"], ["LAB", "Hi!"]]);
    await expect(listMessages(actorOf(fx.patient2), req.id, fx.near.lab.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); // other patient
    await expect(listMessages(lab(fx.edge), req.id, fx.near.lab.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); // other lab
    await expect(sendMessage(lab(fx.far), req.id, fx.far.lab.id, "spam")).rejects.toMatchObject({ code: "NOT_FOUND" }); // not a recipient
    expect((await listMessages(actorOf(fx.admin), req.id, fx.near.lab.id)).messages).toHaveLength(2);
    await expect(sendMessage(actorOf(fx.admin), req.id, fx.near.lab.id, "x")).rejects.toThrow();
    await expect(sendMessage(actorOf(fx.patient), req.id, fx.near.lab.id, "   ")).rejects.toThrow();
    await expect(sendMessage(actorOf(fx.patient), req.id, fx.near.lab.id, "x".repeat(1001))).rejects.toThrow(/too long/i);
    const after = (await listMessages(actorOf(fx.patient), req.id, fx.near.lab.id)).messages[0].createdAt;
    expect((await listMessages(actorOf(fx.patient), req.id, fx.near.lab.id, after)).messages).toHaveLength(1); // polling: only newer
  });
});

describe("prescription images", () => {
  it("compresses large photos to a small WebP (max 1600px, EXIF stripped)", async () => {
    const big = await makeImage(3000, 2400);
    const out = await optimiseImage(big);
    expect(out.mimeType).toBe("image/webp");
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(1600);
    expect(out.bytes).toBeLessThan(big.length);
    const small = await optimiseImage(await makeImage(300, 200, "png"));
    expect(small.width).toBe(300); // never upscaled
  });
  it("rejects non-images, disguised files, unsupported formats and oversized uploads", async () => {
    await expect(optimiseImage(Buffer.from("<script>alert(1)</script>"))).rejects.toThrow(/valid image/i);
    await expect(optimiseImage(Buffer.from("%PDF-1.4 fake"))).rejects.toThrow();
    await expect(optimiseImage(await makeImage(50, 50, "gif"))).rejects.toThrow(/JPG, PNG or WebP/i);
    await expect(optimiseImage(Buffer.alloc(0))).rejects.toThrow();
    await expect(optimiseImage(Buffer.alloc(11 * 1024 * 1024))).rejects.toThrow(/too large/i);
  });
  it("limits unsent uploads per patient", async () => {
    const png = await makeImage(64, 64);
    for (let i = 0; i < 8; i++) await storePendingImage(fx.patient.id, png);
    await expect(storePendingImage(fx.patient.id, png)).rejects.toThrow(/too many/i);
  });
  it("is viewable only by the owner, labs that received the request, and admins", async () => {
    const img = await storePendingImage(fx.patient.id, await makeImage(200, 200));
    const req = await createRequest(fx.patient.id, { imageIds: [img.id] });
    const lab = (l: Fx["near"]) => actorOf({ id: l.owner.id, role: "LAB_OWNER", laboratoryId: l.lab.id });
    expect(await canViewImage(actorOf(fx.patient), img.id)).toBe(true);
    expect(await canViewImage(lab(fx.near), img.id)).toBe(true);
    expect(await canViewImage(actorOf(fx.admin), img.id)).toBe(true);
    expect(await canViewImage(actorOf(fx.patient2), img.id)).toBe(false);
    expect(await canViewImage(lab(fx.far), img.id)).toBe(false);
    expect(await canViewImage(lab(fx.pending), img.id)).toBe(false);
    // unattached uploads are private to their owner
    const pend = await storePendingImage(fx.patient.id, await makeImage(100, 100));
    expect(await canViewImage(lab(fx.near), pend.id)).toBe(false);
    // after another lab wins, losing labs lose the prescription too
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer());
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: req.id } })).id);
    expect(await canViewImage(lab(fx.near), img.id)).toBe(false);
    expect(await canViewImage(lab(fx.edge), img.id)).toBe(true);
  });
});
