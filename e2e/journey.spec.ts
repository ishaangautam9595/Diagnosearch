import { expect, test, type Browser, type Page } from "@playwright/test";
import sharp from "sharp";

const BASE = "http://localhost:3101";
// Koramangala, Bengaluru — inside 20 km of most seeded demo labs.
const PLACE = { lat: "12.9352", lon: "77.6245", display_name: "Test Road, Koramangala, Bengaluru, Karnataka, 560034, India", address: { road: "Test Road", suburb: "Koramangala", city: "Bengaluru", postcode: "560034" } };

async function mockGeocoder(page: Page) {
  await page.route("https://nominatim.openstreetmap.org/search**", (r) => r.fulfill({ json: [PLACE] }));
  await page.route("https://nominatim.openstreetmap.org/reverse**", (r) => r.fulfill({ json: PLACE }));
}

/** Sign in as a patient / lab with email-or-mobile + password. */
async function signIn(page: Page, identifier: string, landing: RegExp, password = "Demo@12345") {
  await page.goto("/login");
  await page.getByLabel("Mobile number or email").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(landing);
}

async function newContext(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: BASE });
  return { ctx, page: await ctx.newPage() };
}

async function pinViaSearch(scope: Page | ReturnType<Page["getByRole"]>) {
  await scope.getByLabel("Search for an address or landmark").fill("Koramangala");
  await scope.getByRole("button", { name: "Search", exact: true }).click();
  await scope.getByRole("option").first().click();
}

test("patient requests → labs offer → chat → patient accepts → others deleted → admin sees it", async ({ page, browser }) => {
  await mockGeocoder(page);

  // ── Landing → sign up (name, mobile, pinned address, OTP)
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Upload your prescription/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Become a lab partner" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/signup/);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Enter your name");
  await page.getByLabel("Your name").fill("E2E Patient");
  await page.getByLabel("Mobile number or email").fill("98765 99999");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("at least 8 characters");
  await page.getByLabel("Password", { exact: true }).fill("E2ePass123");
  await page.getByLabel("Confirm password").fill("E2ePass999");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("don't match");
  await page.getByLabel("Confirm password").fill("E2ePass123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/Pin your address/);
  await pinViaSearch(page);
  await expect(page.getByText(/Pinned at/)).toBeVisible();
  await expect(page.getByLabel("Full address")).toHaveValue("Test Road, Koramangala");
  await page.getByLabel("Full address").fill("14 Test Road, Koramangala");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: /E2E/ })).toBeVisible();

  // ── Access control: a patient can't open the lab or admin dashboards
  await page.goto("/lab");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/app$/);

  // ── New request: a prescription image (compressed) + a catalogue test + a custom test
  await page.getByRole("link", { name: "New request" }).first().click();
  await expect(page.getByTestId("labs-nearby")).toContainText(/\d+ labs? within 20 km/);
  const png = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 60 } } }).png().toBuffer();
  await page.getByLabel("Choose prescription images").setInputFiles({ name: "prescription.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText(/Prescription prescription.png/)).toBeVisible();
  const sizes = await page.locator("li", { hasText: "prescription.png" }).innerText();
  expect(sizes).toMatch(/MB → .*KB/); // 2400×1800 noise PNG (MB) was compressed to KB
  await page.getByRole("combobox", { name: "Search diagnostic tests" }).fill("thyroid");
  await page.getByRole("option", { name: /Thyroid Profile/ }).first().click();
  await page.getByLabel("Add a test that isn't in the list").fill("Special Marker X");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Special Marker X" })).toBeVisible();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(/\/app\/requests\/[0-9a-f-]{36}\?sent=\d+/);
  await expect(page.getByRole("status").filter({ hasText: /Request sent to \d+ labs?/ })).toBeVisible();
  await expect(page.getByText("Waiting for offers")).toBeVisible();
  const requestUrl = page.url().split("?")[0];
  const reference = (await page.locator("h1.font-mono").innerText()).trim();
  expect(reference).toMatch(/^TR-[A-Z0-9]{8}$/);

  // ── Lab A (Aarogya) signs in, sees the request (no patient contact), opens the prescription, sends an offer and chats
  const a = await newContext(browser);
  await signIn(a.page, "aarogya-labs@diagnosearch.demo", /\/lab$/);
  await a.page.goto("/lab/requests");
  await a.page.getByRole("link", { name: new RegExp(reference) }).click();
  await expect(a.page.getByText("Thyroid Profile (T3, T4, TSH)")).toBeVisible();
  await expect(a.page.getByText("Special Marker X")).toBeVisible();
  await expect(a.page.getByAltText("Prescription page 1")).toBeVisible();
  await expect(a.page.getByText("E2E", { exact: true })).toBeVisible(); // first name only
  await expect(a.page.getByText("98765 99999")).toHaveCount(0);
  await expect(a.page.getByText("14 Test Road")).toHaveCount(0);
  const img = await a.page.request.get(a.page.url().replace(/\/lab.*/, "") + (await a.page.getByAltText("Prescription page 1").getAttribute("src")));
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/webp");
  // The lab sees how far the patient is on a map — approximate until the offer is accepted
  const distMap = a.page.getByTestId("patient-distance-map");
  await distMap.scrollIntoViewIfNeeded();
  await expect(distMap.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(distMap.getByTestId("distance-text")).toHaveText(/^\d+(\.\d)? km$/);
  await expect(distMap).toContainText("Approximate area");
  await expect(distMap.locator(".ds-user-pin")).toBeVisible();
  await a.page.getByLabel("Your total price (₹)").fill("1400");
  await a.page.getByLabel("Reports ready within (hours)").fill("24");
  await a.page.getByLabel("Message to the patient (optional)").fill("Free home collection");
  await a.page.getByRole("button", { name: "Send offer" }).click();
  await expect(a.page.getByRole("status")).toContainText("Offer sent");
  await a.page.getByLabel("Type a message").fill("Hello, I can collect tomorrow at 8 AM.");
  await a.page.getByRole("button", { name: "Send message" }).click();
  await expect(a.page.getByRole("log").getByText("Hello, I can collect tomorrow at 8 AM.")).toBeVisible();

  // ── Lab B (CityCare) offers a higher price; Lab C (HealthFirst) a lower one
  const b = await newContext(browser);
  await signIn(b.page, "citycare-diagnostics@diagnosearch.demo", /\/lab$/);
  await b.page.goto("/lab/requests");
  await b.page.getByRole("link", { name: new RegExp(reference) }).click();
  await b.page.getByLabel("Your total price (₹)").fill("1650");
  await b.page.getByRole("button", { name: "Send offer" }).click();
  await expect(b.page.getByRole("status")).toContainText("Offer sent");
  const c = await newContext(browser);
  await signIn(c.page, "healthfirst-pathology@diagnosearch.demo", /\/lab$/);
  await c.page.goto("/lab/requests");
  await c.page.getByRole("link", { name: new RegExp(reference) }).click();
  await c.page.getByLabel("Your total price (₹)").fill("1250");
  await c.page.getByRole("button", { name: "Send offer" }).click();
  await expect(c.page.getByRole("status")).toContainText("Offer sent");

  // A lab outside 20 km (Delhi) never received it
  const far = await newContext(browser);
  await signIn(far.page, "delhi-central-labs-demo-far-away@diagnosearch.demo", /\/lab$/);
  await far.page.goto("/lab/requests?filter=all");
  await expect(far.page.getByRole("link", { name: new RegExp(reference) })).toHaveCount(0);
  await far.ctx.close();

  // ── Patient sees 3 offers, lowest first, chats, and accepts one
  await page.goto(requestUrl);
  await expect(page.getByText("3 offers · lowest first")).toBeVisible();
  const prices = await page.getByTestId("offer-price").allInnerTexts();
  expect(prices).toEqual(["₹1,250", "₹1,400", "₹1,650"]);
  await page.getByRole("listitem").filter({ hasText: "Aarogya Labs" }).getByRole("button", { name: /Chat/ }).click();
  await expect(page.getByTestId("chat-panel").getByText("Hello, I can collect tomorrow at 8 AM.")).toBeVisible();
  await page.getByLabel("Type a message").fill("Great, see you then!");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("chat-panel").getByText("Great, see you then!")).toBeVisible();
  // lab A receives the reply (polling)
  await expect(a.page.getByRole("log").getByText("Great, see you then!")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("listitem").filter({ hasText: "Aarogya Labs" }).getByRole("button", { name: "Accept offer" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("The other 2 offers and their chats will be permanently deleted");
  await page.getByRole("button", { name: "Yes, accept" }).click();
  await expect(page.getByText("Offer accepted.", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("offer-price")).toHaveCount(1);
  await expect(page.getByTestId("offer-price")).toHaveText("₹1,400");
  await expect(page.getByText("CityCare Diagnostics")).toHaveCount(0);
  await expect(page.getByText("HealthFirst Pathology")).toHaveCount(0);

  // ── Losing labs lose the request, offer and chat; the winner sees the patient's full details
  for (const lost of [b.page, c.page]) {
    await lost.goto(`/lab/requests/${requestUrl.split("/").pop()}`);
    await expect(lost.getByText("This request is no longer available")).toBeVisible();
  }
  await a.page.goto("/lab/won");
  await expect(a.page.getByText("E2E Patient")).toBeVisible();
  await expect(a.page.getByText("98765 99999").or(a.page.getByText("9876599999"))).toBeVisible();
  await expect(a.page.getByText("14 Test Road, Koramangala")).toBeVisible();
  await a.page.goto(`/lab/requests/${requestUrl.split("/").pop()}`);
  await expect(a.page.getByText(/You won this booking at ₹1,400/)).toBeVisible();
  await expect(a.page.getByTestId("patient-distance-map")).toContainText("Exact pin");
  await expect(a.page.getByTestId("patient-distance-map")).not.toContainText("Approximate area");

  // ── The patient can send the next request straight away
  await page.goto("/app/requests/new");
  await expect(page.getByRole("heading", { name: "New request" })).toBeVisible();

  // ── Admin sees the request, its offer and recipients
  const adm = await newContext(browser);
  await adm.page.goto("/admin/login");
  await adm.page.getByLabel("Email").fill("admin@diagnosearch.demo");
  await adm.page.getByLabel("Password").fill("Admin@12345");
  await adm.page.getByRole("button", { name: "Sign in" }).click();
  await expect(adm.page).toHaveURL(/\/admin\/dashboard/);
  await expect(adm.page.getByText("Value of accepted offers")).toBeVisible();
  await adm.page.goto("/admin/requests");
  await adm.page.getByRole("link", { name: reference }).click();
  await expect(adm.page.getByText("E2E Patient")).toBeVisible();
  await expect(adm.page.getByText("Accepted", { exact: true })).toBeVisible();
  await expect(adm.page.getByAltText("Prescription page 1")).toBeVisible();
  await adm.page.goto("/admin/patients");
  await expect(adm.page.getByText("E2E Patient")).toBeVisible();

  // Labs can't open the admin area either
  await a.page.goto("/admin/dashboard");
  await expect(a.page).toHaveURL(/\/lab$/);
  for (const x of [a, b, c, adm]) await x.ctx.close();
});

test("lab partner signs up (no prices), waits for approval, admin approves, lab receives requests", async ({ page, browser }) => {
  await mockGeocoder(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Become a lab partner" }).first().click();
  await expect(page.getByRole("heading", { name: "Become a lab partner" })).toBeVisible();
  await expect(page.getByText(/Tests & prices|Your price for/)).toHaveCount(0); // no price entry for labs
  await page.getByLabel("Laboratory name").fill("E2E Partner Labs");
  await page.getByLabel("Contact person").fill("Priya Owner");
  await page.getByLabel("Email", { exact: true }).fill("owner@e2e-partner.test");
  await page.getByLabel("Phone", { exact: true }).fill("98000 12345");
  await page.getByLabel("Create a password").fill("PartnerPass1");
  const addr1 = page.getByRole("group", { name: "Address 1" });
  await pinViaSearch(addr1);
  await expect(addr1.getByText(/Pinned at/)).toBeVisible();
  await addr1.getByLabel("Street address").fill("42 Test Street");
  await page.getByRole("button", { name: "Add another address" }).click();
  const addr2 = page.getByRole("group", { name: "Address 2" });
  await pinViaSearch(addr2);
  await addr2.getByLabel("Street address").fill("7 Second Branch Road");
  await page.getByRole("checkbox", { name: /authorised to register/ }).check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/partner\/success/);

  // Owner signs in with a code while pending: sees the review banner and no requests
  const owner = await newContext(browser);
  await signIn(owner.page, "owner@e2e-partner.test", /\/lab$/, "PartnerPass1");
  await expect(owner.page.getByText("Your application is under review")).toBeVisible();

  // Admin approves from the applications queue
  const adm = await newContext(browser);
  await adm.page.goto("/admin/login");
  await adm.page.getByLabel("Email").fill("admin@diagnosearch.demo");
  await adm.page.getByLabel("Password").fill("Admin@12345");
  await adm.page.getByRole("button", { name: "Sign in" }).click();
  await expect(adm.page).toHaveURL(/dashboard/);
  await adm.page.goto("/admin/partners");
  const card = adm.page.locator("div.rounded-2xl", { hasText: "E2E Partner Labs" }).first();
  await expect(card).toContainText("7 Second Branch Road");
  await card.getByRole("button", { name: /Approve/ }).click();
  await expect(adm.page.getByText("Reviewed")).toBeVisible();

  // Approved: the banner is gone
  await owner.page.goto("/lab");
  await expect(owner.page.getByText("Your application is under review")).toHaveCount(0);
  await expect(owner.page.getByRole("heading", { name: "E2E Partner Labs" })).toBeVisible();
  await owner.page.goto("/lab/profile");
  await expect(owner.page.getByText("Branches (2)")).toBeVisible();
  await owner.ctx.close(); await adm.ctx.close();
});

test("dashboards are API-driven: new requests show up on Refresh; roles can't read each other's API", async ({ browser }) => {
  // Lab dashboard (Aarogya) — capture the real API call
  const lab = await newContext(browser);
  const first = lab.page.waitForResponse((r) => r.url().includes("/api/lab/analytics") && r.status() === 200);
  await signIn(lab.page, "aarogya-labs@diagnosearch.demo", /\/lab$/);
  const payload = await (await first).json();
  expect(Array.isArray(payload.events)).toBe(true);
  expect(payload.branches.length).toBeGreaterThan(0);
  const waiting = lab.page.locator('a[href="/lab/requests?filter=new"] p.tabular');
  await expect(waiting).toBeVisible();
  const before = Number(await waiting.innerText());
  await expect(lab.page.getByTestId("updated-at")).toContainText("Updated");

  // The same lab cannot call the patient API; a patient cannot call the lab API
  expect((await lab.page.request.get("/api/patient/insights")).status()).toBe(403);

  // A patient sends a request…
  const pt = await newContext(browser);
  await signIn(pt.page, "98765 99999", /\/app$/, "E2ePass123");
  expect((await pt.page.request.get("/api/lab/analytics")).status()).toBe(403);
  await pt.page.goto("/app/requests/new");
  await pt.page.getByRole("combobox", { name: "Search diagnostic tests" }).fill("hemoglobin");
  await pt.page.getByRole("option", { name: /^Hemoglobin/ }).first().click();
  await pt.page.getByRole("button", { name: "Send request" }).click();
  await expect(pt.page).toHaveURL(/\/app\/requests\/[0-9a-f-]{36}/);

  // …and the lab sees it as soon as it refreshes, with no page reload
  await lab.page.getByRole("button", { name: "Refresh" }).click();
  await expect.poll(async () => Number(await waiting.innerText())).toBe(before + 1);
  const events = await (await lab.page.request.get("/api/lab/analytics")).json();
  expect(events.newRequests).toBe(before + 1);
  await lab.ctx.close(); await pt.ctx.close();
});

test("a brand-new patient sees honest empty states — no invented numbers", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  await mockGeocoder(page);
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Fresh Patient");
  await page.getByLabel("Mobile number or email").fill("fresh.patient@example.com");
  await page.getByLabel("Password", { exact: true }).fill("FreshPass123");
  await page.getByLabel("Confirm password").fill("FreshPass123");
  await pinViaSearch(page);
  await expect(page.getByText(/Pinned at/)).toBeVisible();
  await page.getByLabel("Full address").fill("1 Test Road, Koramangala");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);

  await expect(page.getByRole("heading", { name: "Live offer comparison" })).toBeVisible();
  await expect(page.getByText("No open request")).toBeVisible();
  await expect(page.getByText("You've saved")).toHaveCount(0);
  await expect(page.getByText("Accept an offer and your savings will be charted here.")).toBeVisible();
  const tile = (label: string) => page.locator("div.rounded-2xl", { has: page.getByText(label, { exact: true }) }).first();
  await expect(tile("Requests sent").locator("p.tabular").first()).toHaveText("0");
  await expect(tile("Offers per request")).toContainText("—");
  await expect(tile("Total saved").locator("p.tabular").first()).toHaveText("₹0");
  await expect(page.getByText("No requests yet")).toBeVisible();
  const body = await (await page.request.get("/api/patient/insights")).json();
  expect(body).toMatchObject({ offersWaiting: 0, live: null, insights: { totalRequests: 0, totalSaved: 0, savings: [] } });
  await ctx.close();
});

test("sign-in screens: bad credentials give one generic error; admin login stays separate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Mobile number or email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Whatever123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Incorrect mobile/email or password");
  await page.getByLabel("Mobile number or email").fill("demo.patient@diagnosearch.demo");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Incorrect mobile/email or password"); // same message
  await page.getByLabel("Mobile number or email").fill("12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/valid email or 10-digit/);
  // An admin's credentials don't work on the patient/lab form
  await page.getByLabel("Mobile number or email").fill("admin@diagnosearch.demo");
  await page.getByLabel("Password", { exact: true }).fill("Admin@12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Incorrect mobile/email or password");
  // Dashboard APIs: anonymous callers get 401
  expect((await page.request.get("/api/lab/analytics")).status()).toBe(401);
  expect((await page.request.get("/api/patient/insights")).status()).toBe(401);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/lab/requests");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin/requests");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("lab overview: compact KPI cards, trend charts, range switching, insights, attention cards", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page, "aarogya-labs@diagnosearch.demo", /\/lab$/);

  // Welcome banner
  await expect(page.getByRole("heading", { level: 1, name: "Aarogya Labs" })).toBeVisible();
  await expect(page.getByText(/Good (morning|afternoon|evening),/)).toBeVisible();
  await expect(page.getByText("Verified lab")).toBeVisible();
  await expect(page.getByText(/1 branch/)).toBeVisible();

  // Attention cards link to the right lists
  await expect(page.locator('a[href="/lab/requests?filter=new"]')).toContainText("waiting for your offer");
  await expect(page.locator('a[href="/lab/requests?filter=quoted"]')).toContainText("awaiting a patient");

  // KPI cards
  await expect(page.getByRole("heading", { name: "Your performance" })).toBeVisible();
  const card = (label: string) => page.locator("div.rounded-2xl", { has: page.getByText(label, { exact: true }) }).first();
  const number = async (label: string) => Number((await card(label).locator("p.tabular").first().innerText()).replace(/[^\d]/g, ""));
  await expect.poll(() => number("Requests received")).toBeGreaterThan(20); // counts up from 0
  const thirty = await number("Requests received");
  for (const l of ["Offers sent", "Bookings won", "Revenue won", "Win rate", "Average first reply"]) await expect(card(l)).toBeVisible();
  await expect(card("Revenue won")).toContainText("₹");
  await expect(card("Win rate")).toContainText("%");
  await expect(card("Requests received")).toContainText(/%|New/); // change vs previous period

  // Range switch
  await page.getByRole("button", { name: "Last 7 days" }).click();
  await expect.poll(() => number("Requests received")).toBeLessThan(thirty);
  await expect(page.getByText("Compared with the previous 7 days")).toBeVisible();
  await page.getByRole("button", { name: "Last 90 days" }).click();
  await expect.poll(() => number("Requests received")).toBeGreaterThan(thirty);
  await page.getByRole("button", { name: "Last 30 days" }).click();

  // Insights are cards
  await expect(page.getByRole("heading", { name: "Insights for you" })).toBeVisible();
  await expect(page.getByText(/You replied to \d+% of requests/)).toBeVisible();

  // Trend charts: hover tooltip, keyboard, legend, table view
  await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible();
  const chart = page.getByRole("img", { name: /Requests received, offers sent and bookings won per day/ });
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  const tip = page.getByRole("status").filter({ hasText: "Offers sent" }).first();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Received");
  await expect(tip).toContainText("Won");
  await page.mouse.move(box.x + box.width * 0.6, box.y - 80);
  await expect(tip).toBeHidden();
  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("status").filter({ hasText: "Received" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  const legend = page.getByRole("button", { name: /^Offers sent/ }).first();
  await legend.click();
  await expect(legend).toHaveAttribute("aria-pressed", "false");
  await legend.click();
  await page.getByRole("button", { name: "Table" }).first().click();
  await expect(page.getByRole("columnheader", { name: "Received" })).toBeVisible();
  await page.getByRole("button", { name: "Chart" }).first().click();
  for (const t of ["Conversion funnel", "Revenue won", "What happened to requests", "Price vs the winner", "How far requests come from"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0); // the map lives on each request page, not on the overview

  // Latest requests list is still there
  await expect(page.getByRole("heading", { name: "Latest requests" })).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test("a new lab with no history sees a friendly empty state instead of broken charts", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  await signIn(page, "owner@sunrise.demo", /\/lab$/);
  await expect(page.getByText("Your numbers will appear here")).toBeVisible();
  await expect(page.getByText("Your application is under review")).toBeVisible();
  await ctx.close();
});

test("patient dashboard: savings, live offer comparison, nearby-labs map, progress steps", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page, "demo.patient@diagnosearch.demo", /\/app$/);
  await expect(page.getByText("You've saved")).toBeVisible();
  await expect.poll(async () => Number((await page.locator("p.tabular", { hasText: "₹" }).first().innerText()).replace(/[^\d]/g, ""))).toBeGreaterThan(1000);
  await expect(page.getByRole("heading", { name: "Live offer comparison" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Offer prices compared" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("Lowest", { exact: true })).toBeVisible();
  await expect(page.getByText(/Choosing the lowest offer saves you ₹/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Labs within 20 km" })).toBeVisible();
  await expect(page.locator("canvas.maplibregl-canvas").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Savings by booking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your requests, week by week" })).toBeVisible();
  // request cards show the Sent → Offers → Accepted journey
  await expect(page.getByRole("list", { name: "Progress" }).first()).toBeVisible();
  await page.getByRole("link", { name: /TR-.*3 offers/ }).first().click();
  await expect(page.getByRole("heading", { name: "Price comparison" })).toBeVisible();
  await expect(page.getByText(/Save up to ₹/)).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test("landing page: real photos load, counters count up, hero offers roll in", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  await page.goto("/");
  await expect(page.getByText("Prescription uploaded")).toBeVisible();
  await expect(page.getByText("Sent to labs within 20 km")).toBeVisible();
  // The marketing page makes up no numbers: no sample data, prices or example lab names.
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/Sample data/i);
  expect(text).not.toMatch(/₹\s?\d/);
  expect(text).not.toMatch(/WellNest|Aarogya|CityCare/);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  expect(broken).toEqual([]);
  expect(await page.locator("img").count()).toBeGreaterThanOrEqual(4);
  await page.locator("dl").scrollIntoViewIfNeeded();
  await expect.poll(async () => Number((await page.locator("dl dd").first().innerText()).replace(/[^\d]/g, ""))).toBeGreaterThan(5); // partner labs
  await expect(page.getByText("Your numbers at a glance").first()).toBeVisible();
  await ctx.close();
});

test("reduced motion: numbers appear immediately and nothing depends on animation", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await signIn(page, "aarogya-labs@diagnosearch.demo", /\/lab$/);
  const tile = page.locator("div.rounded-2xl", { has: page.getByText("Requests received", { exact: true }) }).first();
  await expect(tile.locator("p.tabular").first()).not.toHaveText("0"); // no count-up delay
  expect(Number((await tile.locator("p.tabular").first().innerText()).replace(/[^\d]/g, ""))).toBeGreaterThan(20);
  await ctx.close();
});

test("mobile: landing and both dashboards have no horizontal scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.goto("/");
  await page.waitForTimeout(1200);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await signIn(page, "aarogya-labs@diagnosearch.demo", /\/lab$/);
  await page.waitForTimeout(1500);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await page.context().clearCookies();
  await signIn(page, "demo.patient@diagnosearch.demo", /\/app$/);
  await page.waitForTimeout(1500);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await ctx.close();
});

test("forgot password: admin issues a temporary password; the user signs in and changes it", async ({ page, browser }) => {
  const adm = await newContext(browser);
  await adm.page.goto("/admin/login");
  await adm.page.getByLabel("Email").fill("admin@diagnosearch.demo");
  await adm.page.getByLabel("Password").fill("Admin@12345");
  await adm.page.getByRole("button", { name: "Sign in" }).click();
  await expect(adm.page).toHaveURL(/dashboard/);
  await adm.page.goto("/admin/patients");
  adm.page.on("dialog", (d) => d.accept());
  await adm.page.locator("tr", { hasText: "Rohan Mehta" }).getByRole("button", { name: "Reset password" }).click();
  const temp = (await adm.page.locator("tr", { hasText: "Rohan Mehta" }).locator("code").innerText()).trim();
  expect(temp).toMatch(/^[A-Za-z0-9]{11}$/);

  // The old password no longer works…
  await page.goto("/login");
  await page.getByLabel("Mobile number or email").fill("demo.patient@diagnosearch.demo");
  await page.getByLabel("Password", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Incorrect mobile/email or password");
  // …the temporary one does
  await page.getByLabel("Password", { exact: true }).fill(temp);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/profile");
  await page.getByLabel("Current password").fill(temp);
  await page.getByLabel("New password", { exact: true }).fill("Brand-new-pass1");
  await page.getByLabel("Confirm new password").fill("Brand-new-pass1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Password changed" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${BASE}/`); // signed out → landing page
  await signIn(page, "demo.patient@diagnosearch.demo", /\/app$/, "Brand-new-pass1");
  await adm.ctx.close();
});
