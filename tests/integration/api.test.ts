import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { seedFixture } from "../helpers/fixtures";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookieJar.has(n) ? { name: n, value: cookieJar.get(n)! } : undefined),
    set: (n: string, v: string) => void cookieJar.set(n, v),
    delete: (n: string) => void cookieJar.delete(n),
  }),
}));
vi.mock("next/cache", () => ({ updateTag: () => {}, revalidatePath: () => {}, cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { startSession } from "@/lib/auth";
import { GET as labAnalytics } from "@/app/api/lab/analytics/route";
import { GET as patientInsights } from "@/app/api/patient/insights/route";
import { acceptOffer, createRequest } from "@/lib/services/requests";
import { sendOffer } from "@/lib/services/lab-portal";

type Fx = Awaited<ReturnType<typeof seedFixture>>;
let fx: Fx;
beforeEach(async () => { fx = await seedFixture(); cookieJar.clear(); });
const offer = (price: number) => ({ totalPrice: price, homeCollectionAvailable: "on", reportTimeHours: 24 });
const json = async (r: Response) => ({ status: r.status, body: await r.json(), cache: r.headers.get("cache-control") });

describe("GET /api/lab/analytics", () => {
  it("requires a signed-in lab owner", async () => {
    expect((await json(await labAnalytics())).status).toBe(401);
    await startSession(fx.patient.id, "PATIENT");
    expect((await json(await labAnalytics())).status).toBe(403);
    await startSession(fx.admin.id, "ADMIN");
    expect((await json(await labAnalytics())).status).toBe(403);
  });
  it("returns real, live numbers from the database — and nothing when there is no activity", async () => {
    await startSession(fx.near.owner.id, "LAB_OWNER");
    const empty = await json(await labAnalytics());
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ events: [], newRequests: 0, openOffers: 0 });
    expect(empty.body.branches).toHaveLength(1);
    expect(empty.cache).toBe("private, no-store");

    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    let r = (await json(await labAnalytics())).body;
    expect(r).toMatchObject({ newRequests: 1, openOffers: 0 });
    expect(r.events.map((e: { k: string }) => e.k)).toEqual(["R"]);

    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    r = (await json(await labAnalytics())).body;
    expect(r).toMatchObject({ newRequests: 0, openOffers: 1 });
    expect(r.events.map((e: { k: string }) => e.k)).toEqual(["R", "O"]);
    expect(r.events[1].a).toBe(900);
  });
  it("scopes data to the signed-in lab: it can never read another lab's numbers", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(1000));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer(700));
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.edge.lab.id } })).id);
    await startSession(fx.near.owner.id, "LAB_OWNER");
    const near = (await json(await labAnalytics())).body;
    expect(near.events.map((e: { k: string }) => e.k).sort()).toEqual(["L", "O", "R"]);
    expect(near.events.find((e: { k: string }) => e.k === "L")).toMatchObject({ a: 1000, c: 700 });
    await startSession(fx.edge.owner.id, "LAB_OWNER");
    const edge = (await json(await labAnalytics())).body;
    expect(edge.events.map((e: { k: string }) => e.k).sort()).toEqual(["O", "R", "W"]);
    expect(JSON.stringify(edge)).not.toContain("1000"); // no trace of the other lab's bid
    await startSession(fx.far.owner.id, "LAB_OWNER");
    expect((await json(await labAnalytics())).body.events).toEqual([]); // out of range, saw nothing
  });
});

describe("GET /api/patient/insights", () => {
  it("requires a signed-in patient", async () => {
    expect((await json(await patientInsights())).status).toBe(401);
    await startSession(fx.near.owner.id, "LAB_OWNER");
    expect((await json(await patientInsights())).status).toBe(403);
  });
  it("returns zeros and no live offers for a patient with no activity (no invented data)", async () => {
    await startSession(fx.patient2.id, "PATIENT");
    const { status, body, cache } = await json(await patientInsights());
    expect(status).toBe(200);
    expect(cache).toBe("private, no-store");
    expect(body).toMatchObject({ offersWaiting: 0, live: null, insights: { totalRequests: 0, totalSaved: 0, avgOffersPerRequest: null, savings: [] } });
    expect(body.insights.nearbyLabs.map((l: { name: string }) => l.name)).toEqual(["Near Lab", "Branch Lab", "Edge Lab"]); // real labs in range
    expect(body.home).toEqual({ lat: 19, lng: 72.8 });
  });
  it("reflects live offers and real savings, only for the signed-in patient", async () => {
    const req = await createRequest(fx.patient.id, { testIds: [fx.t1.id] });
    await sendOffer(fx.near.lab.id, fx.near.owner.id, req.id, offer(900));
    await sendOffer(fx.edge.lab.id, fx.edge.owner.id, req.id, offer(650));
    await startSession(fx.patient.id, "PATIENT");
    let b = (await json(await patientInsights())).body;
    expect(b.offersWaiting).toBe(2);
    expect(b.live.offers.map((o: { price: number }) => o.price).sort()).toEqual([650, 900]);
    await acceptOffer(fx.patient.id, (await db.offer.findFirstOrThrow({ where: { requestId: req.id, laboratoryId: fx.edge.lab.id } })).id);
    b = (await json(await patientInsights())).body;
    expect(b).toMatchObject({ offersWaiting: 0, live: null, insights: { accepted: 1, totalSaved: 250 } });
    await startSession(fx.patient2.id, "PATIENT");
    b = (await json(await patientInsights())).body;
    expect(b.insights.totalRequests).toBe(0); // another patient's data is invisible
  });
});
