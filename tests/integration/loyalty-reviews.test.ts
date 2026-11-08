import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { acceptOffer, createRequest, getPatientRequest } from "@/lib/services/requests";
import { sendOffer } from "@/lib/services/lab-portal";
import { coinsForAmount, completeRequest, getLoyalty, getRatingSummaries, listLabReviews, submitReview } from "@/lib/services/loyalty";
import { seedFixture } from "../helpers/fixtures";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); });

async function acceptedBooking(price = 555) {
  const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
  const offer = await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, { totalPrice: price, homeCollectionAvailable: "on" });
  await acceptOffer(fx.patient.id, offer.id);
  return req;
}

describe("loyalty coins", () => {
  it("awards 1 coin per ₹10 (min 1)", () => {
    expect([coinsForAmount(555), coinsForAmount(1000), coinsForAmount(3)]).toEqual([55, 100, 1]);
  });
  it("credits the patient exactly once when the winning lab completes the booking", async () => {
    const req = await acceptedBooking();
    const r = await completeRequest(fx.near.lab.id, fx.near.owner.id, req.id);
    expect(r.coins).toBe(55);
    const row = await db.testRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(row).toMatchObject({ status: "COMPLETED", coinsAwarded: 55 });
    expect((await getLoyalty(fx.patient.id)).balance).toBe(55);
    await expect(completeRequest(fx.near.lab.id, fx.near.owner.id, req.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await getLoyalty(fx.patient.id)).balance).toBe(55);
  });
  it("refuses a lab that did not win, and requests that are not accepted yet", async () => {
    const open = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await expect(completeRequest(fx.near.lab.id, fx.near.owner.id, open.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const req = await acceptedBooking();
    await expect(completeRequest(fx.edge.lab.id, fx.edge.owner.id, req.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getLoyalty(fx.patient.id)).balance).toBe(0);
  });
});

describe("lab reviews", () => {
  it("lets the patient review only after completion, once, and exposes it publicly by first name", async () => {
    const req = await acceptedBooking();
    await expect(submitReview(fx.patient.id, req.id, { rating: 5 })).rejects.toThrow(/marks your booking completed/i);
    await completeRequest(fx.near.lab.id, fx.near.owner.id, req.id);
    await expect(submitReview(fx.patient2.id, req.id, { rating: 5 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(submitReview(fx.patient.id, req.id, { rating: 6 })).rejects.toThrow(/star rating/i);
    await expect(submitReview(fx.patient.id, req.id, { rating: 4, comment: "  Quick and clean  " })).resolves.toMatchObject({ rating: 4, comment: "Quick and clean" });
    await expect(submitReview(fx.patient.id, req.id, { rating: 1 })).rejects.toThrow(/already reviewed/i);

    expect((await getRatingSummaries([fx.near.lab.id])).get(fx.near.lab.id)).toEqual({ average: 4, count: 1 });
    const [pub] = await listLabReviews(fx.near.lab.id);
    expect(pub).toMatchObject({ rating: 4, comment: "Quick and clean", reviewer: fx.patient.name.split(" ")[0] });
    expect(JSON.stringify(pub)).not.toContain(fx.patient.email ?? "@@none");
    const detail = await getPatientRequest(fx.patient.id, req.id);
    expect(detail?.review?.rating).toBe(4);
  });
});

describe("request search & pagination", () => {
  it("paginates, filters by status and searches reference, tests and lab names", async () => {
    const { searchPatientRequests, REQUESTS_PAGE_SIZE } = await import("@/lib/services/requests");
    for (let i = 0; i < REQUESTS_PAGE_SIZE + 2; i++) await createRequest(fx.patient.id, { testIds: [], customTests: [`Custom Panel ${i}`] });
    const done = await acceptedBooking();
    await completeRequest(fx.near.lab.id, fx.near.owner.id, done.id);

    const p1 = await searchPatientRequests(fx.patient.id, {});
    expect(p1).toMatchObject({ total: REQUESTS_PAGE_SIZE + 3, page: 1, pageCount: 2 });
    expect(p1.items).toHaveLength(REQUESTS_PAGE_SIZE);
    const p2 = await searchPatientRequests(fx.patient.id, { page: 2 });
    expect(p2.items).toHaveLength(3);
    expect((await searchPatientRequests(fx.patient.id, { page: 99 })).page).toBe(2); // clamped

    const completed = await searchPatientRequests(fx.patient.id, { filter: "completed" });
    expect(completed.items.map((r) => r.id)).toEqual([done.id]);
    expect(completed.items[0]).toMatchObject({ labName: fx.near.lab.name, coinsAwarded: 55 });
    expect(completed.counts).toMatchObject({ all: REQUESTS_PAGE_SIZE + 3, completed: 1, open: REQUESTS_PAGE_SIZE + 2 });

    expect((await searchPatientRequests(fx.patient.id, { q: "custom panel 3" })).total).toBe(1);
    expect((await searchPatientRequests(fx.patient.id, { q: done.reference.toLowerCase() })).total).toBe(1);
    expect((await searchPatientRequests(fx.patient.id, { q: fx.near.lab.name })).items.map((r) => r.id)).toEqual([done.id]);
    expect((await searchPatientRequests(fx.patient2.id, {})).total).toBe(0); // never another patient's
  });
});
