# DiagnoSearch — let nearby labs compete for your diagnostic tests

Patients sign up, then upload a **prescription photo** and/or list **tests**. The request goes to **every approved laboratory
within 20 km** of the patient's address. Labs reply with their best price; the patient chats with them and **accepts one offer —
all other offers and chats for that request are deleted**. Three dashboards: **patient**, **lab partner**, **admin**.

Next.js 16 (App Router, Cache Components), React 19, TypeScript (strict), Tailwind 4, Prisma 7 + PostgreSQL, Zod,
MapLibre GL + OpenFreeMap, sharp (image optimisation), Framer Motion.

## Quick start

```bash
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET (openssl rand -base64 48)
npm install                     # also runs `prisma generate` + copies the MapLibre worker
npx prisma migrate dev
npm run db:seed                 # admin logins + starter test catalogue (no fake data)
npm run dev                     # http://localhost:3000
```

### No dummy data — everything on screen is real

`npm run db:seed` is **idempotent and non-destructive** and loads only:

- an admin and a staff login (`admin@diagnosearch.demo` / `Admin@12345` — dev only, refuses to run in production), and
- the starter **test catalogue** (names and categories only — no prices, turnaround times or preparation advice).

It creates **no labs, patients, requests, offers or activity**. To see the dashboards fill up, use the app like real users do:

1. `/partner` — register a lab (pin its address), then approve it in **Admin → Applications**.
2. `/signup` — create a patient (pin an address within 20 km of the lab), send a request.
3. Sign in as the lab at `/login`, reply with an offer; chat; accept as the patient.

Every chart, KPI and map reads live data through the API (below). With no activity they show clear empty states, never samples.

**Already have fictional data from an older seed?** `npm run db:clean-demo` shows what would go; `npm run db:clean-demo -- --yes`
deletes only the fictional demo labs/accounts/activity (real data is left alone).

**Test data lives only in tests:** Vitest builds its own fixtures (`tests/helpers/fixtures.ts`) and the Playwright suite loads
`prisma/seed-test.ts` — which refuses to run against any database whose name doesn't contain `_test`.

### Dashboard API

| Endpoint | Who | Returns |
|---|---|---|
| `GET /api/lab/analytics` | lab owner | the lab's events (received/offered/won/lost), branches and live counts |
| `GET /api/patient/insights` | patient | the patient's savings, response times, weekly activity, labs within 20 km and live offers |

Both are `no-store`, return 401 when signed out and 403 for the wrong role, and always scope to the **signed-in** account
(the lab id comes from the session, never the query string). The dashboards poll them every 30 s and when the tab regains
focus, with a "Updated Ns ago · Refresh" control and a visible banner if a refresh fails (last data stays on screen).

## The flow

1. **Landing page** (`/`) — explains the product; "Get started" and **Become a lab partner**.
2. **Patient sign-up** (`/signup`) — name, mobile or email, password, and an address pinned on a map (search or click/drag).
3. **Patient dashboard** (`/app`) — new request (prescription images and/or tests, any mix), offers, chat, accept, profile.
   - Images are **compressed in the browser** (max 1600 px, WebP) and **re-optimised on the server** (sharp: auto-rotate, strip
     EXIF, WebP, 10 MB raw cap, only real JPG/PNG/WebP). A 2400×1800 phone photo becomes a few hundred KB.
   - Up to 10 tests per request (catalogue search or free text) and 4 images.
4. **Matching** — labs that are *approved + active* with a branch within **20 km** of the patient's pinned address receive the
   request (nearest branch counts). Optional "home collection only" filter.
5. **Lab dashboard** (`/lab`) — new requests, prescription viewer, send/update an offer (total price, home collection, report
   time, note), chat, won bookings, profile. Labs see only the patient's **first name and area** until their offer is accepted.
6. **Offers & chat** — the patient sees offers lowest-first and chats with each lab (polling every 4 s, no websocket server).
7. **Accept** — one transaction: the request closes, the chosen offer is accepted, and **all other offers, chats and those
   labs' access to the request and prescription are deleted**. The winning lab alone gets the patient's contact details and
   keeps the chat. The patient can send a new request immediately.
8. **Admin dashboard** (`/admin`) — stats, requests (with offers/recipients), patients (disable/enable), laboratories (map-based
   multi-address editor, manual verification), partner **applications** (approve/reject), test catalogue, categories, settings.

### Lab partner sign-up (`/partner`)

Labs enter business details, contact, opening hours, home-collection and **one or more pinned addresses** — **no prices**.
Labs also choose a password. Submitting creates a *pending* lab and the owner's login. The owner can sign in right away (sees
"under review"); the lab receives requests only after an admin approves it.

## Dashboards, charts & motion

- **Lab dashboard** (`/lab`): a compact overview — welcome banner, "waiting for your offer" / "awaiting a decision"
  cards, six KPI cards (requests, offers, wins, revenue, win rate, first-reply time) with change vs the previous period and a
  7/30/90-day switch, a **Trends** section (requests/offers/wins chart with hover + keyboard + table view, conversion funnel, revenue, outcomes,
  price-vs-winner, distance bands) and insight cards written from the lab's own data. Each request page has a map showing how far the
  patient is (approximate until the offer is accepted).
- **Patient dashboard** (`/app`): savings hero, KPI tiles, live offer-price comparison, a map of labs within 20 km, savings per
  booking, weekly activity, and a Sent → Offers → Accepted progress rail on every request.
- **Charts are hand-built SVG** (no chart library) following a validated colour palette: one y-axis, thin marks, rounded
  data-ends, legend + tooltips + table view for accessibility, direct values instead of colour-only meaning.
- **Why history survives deletion:** when a patient accepts an offer, losing offers/chats are deleted, but an anonymous
  `LabEvent` row (counts, prices, ~1 km location — no patient content) is kept so labs can see win rate, response time and how
  their price compared with the winner. Patients get `highestOfferAtAccept` to show "you saved ₹X".
- **Motion** uses Framer Motion + CSS and honours the system "reduce motion" setting. Landing photos are from Unsplash
  (Unsplash License), optimised to WebP in `public/images`.

## Passwords & accounts

- Sign-in is **email-or-mobile + password** (bcrypt, 8–72 chars, letters + a number), rate-limited per account and per IP, with one
  generic error so accounts can't be probed. Admins use `/admin/login`; their credentials don't work on the patient/lab form.
- **The mobile number / email is not verified** — there is no SMS or email gateway in this build (free, reliable SMS OTP for India
  doesn't exist; email OTP needs your own provider keys). If you want verification later, add a provider (e.g. Brevo/Resend for
  email) and a verification step at sign-up.
- **Forgot password:** with no email/SMS channel, an admin issues a **temporary password** from *Admin → Patients* or
  *Admin → Laboratories* ("Reset password"; shown once, audit-logged). Users change it themselves on their profile page.

## Production checklist

1. PostgreSQL + `DATABASE_URL`, strong `AUTH_SECRET`.
2. `npm run db:deploy` — do **not** seed. `npm run create-admin -- you@yourco.com "Your Name" 'a-long-password'`.
3. HTTPS, and make your proxy set `X-Forwarded-For` (used for rate limits).
4. Review/approve real lab applications and verify labs manually.
5. Address search uses public OpenStreetMap services from the browser (Nominatim). For real traffic point
   `lib/client/geocode.ts` at a hosted Nominatim/Photon instance.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm test` | Vitest — unit + database integration tests (uses `diagnosearch_test` via `.env.test`) |
| `npm run test:e2e` | Playwright in a real browser against the test database, loaded with `prisma/seed-test.ts` fixtures |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma (seed = admin + starter catalogue only) |
| `npm run db:clean-demo [-- --yes]` | remove fictional data left by older seeds |

Test DB (once): `createdb diagnosearch_test`, a `.env.test` with `DATABASE_URL` (must contain `_test`), and `AUTH_SECRET`, then `DATABASE_URL=… npx prisma migrate deploy`. Playwright: `npx playwright install chromium`.

## Architecture

```
app/(public)/      landing, /partner (+success)          app/(auth)/   /login, /signup
app/app/           patient dashboard                       app/lab/      lab dashboard
app/admin/         admin (password login at /admin/login)  app/api/      prescriptions, chat polling, test suggest
lib/services/      accounts (password auth), requests (create/accept/cancel), lab-portal (offers), chat (+access rules),
                   prescriptions (sharp), partner, admin, admin-portal, admin-catalogue, test-catalogue
lib/auth.ts        signed-cookie sessions; roles ADMIN | STAFF | PATIENT | LAB_OWNER re-read from the DB each request
proxy.ts           optimistic redirect only — real checks are server-side in every page, action and API route
```

Security highlights: role re-checked server-side everywhere; passwords are bcrypt-hashed; prescription images are served only to the owner, labs that received the request, and admins; chat is
scoped to (patient, receiving lab) and read-only for admins; patient identity is hidden from labs until acceptance; rate limits
on logins, uploads, requests, chat and applications; audit log for admin actions and key events.

## Known limitations (MVP)

No payments; offers are a single total price (details go in chat). Chat is polling-based. Stats can't show "lost" offers
because they're deleted on accept (by design). Lab owners can't edit their profile (admin does). Distances are straight-line.
