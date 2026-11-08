import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Camera, CheckCircle2, Coins, MapPin, Radar } from "lucide-react";
import { requirePatientPage } from "@/lib/auth";
import { getPatientRequest } from "@/lib/services/requests";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { RequestJourney } from "@/components/patient/request-journey";
import { OfferComparison } from "@/components/patient/offer-comparison";
import { OffersWorkspace } from "@/components/patient/offers-workspace";
import { CancelRequestButton } from "@/components/patient/cancel-request-button";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Request" };

export default async function RequestDetailPage({ params, searchParams }: PageProps<"/app/requests/[id]">) {
  const me = await requirePatientPage();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await getPatientRequest(me.id, id);
  if (!r) notFound();
  const open = r.status === "OPEN";
  const completedOffer = r.status === "COMPLETED" ? r.offers.find((o) => o.status === "ACCEPTED") : undefined;
  const justSent = typeof sp.sent === "string" ? Number(sp.sent) : null;

  return (
    <>
      {open ? <AutoRefresh seconds={10} /> : null}
      <Link href="/app/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"><ArrowLeft className="size-4" /> My requests</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{r.reference}</h1>
        <RequestStatusBadge status={r.status} />
        <span className="text-sm text-muted">Sent {formatDate(r.createdAt, true)}</span>
        {open ? <div className="ml-auto"><CancelRequestButton requestId={r.id} /></div> : null}
      </div>

      <Card className="mb-5 py-4"><RequestJourney status={r.status} offers={r.offers.length} /></Card>

      {justSent !== null && open ? (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl bg-mint p-4 text-sm font-medium text-primary-dark">
          <CheckCircle2 className="size-5" /> {justSent > 0 ? `Request sent to ${justSent} lab${justSent === 1 ? "" : "s"} within ${r.radiusKm} km. Offers will appear below.` : `No laboratories are within ${r.radiusKm} km of your address yet. We'll keep your request open.`}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card className="space-y-4 lg:self-start">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Your request</h2>
            {r.tests.length ? <ul className="space-y-1 text-sm">{r.tests.map((t) => <li key={t.id}>• {t.name}</li>)}</ul> : <p className="text-sm text-muted">Prescription only</p>}
          </div>
          {r.images.length ? (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Camera className="size-4" /> Prescription</h3>
              <div className="grid grid-cols-2 gap-2">
                {r.images.map((img, i) => (
                  <a key={img.id} href={`/api/prescriptions/${img.id}`} target="_blank" rel="noreferrer" aria-label={`Open prescription page ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/prescriptions/${img.id}`} alt={`Prescription page ${i + 1}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs text-muted">Collection</dt><dd>{r.service === "ANY" ? "Either" : r.service === "HOME_COLLECTION" ? "Home collection" : "Lab visit"}</dd></div>
            {r.notes ? <div><dt className="text-xs text-muted">Your note</dt><dd>{r.notes}</dd></div> : null}
            <div><dt className="text-xs text-muted">Location</dt><dd className="flex gap-1"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {r.addressLine}, {r.city} {r.pincode}</dd></div>
          </dl>
        </Card>

        <div>
          {r.status === "CANCELLED" ? (
            <Card className="text-center text-muted">This request was cancelled. Its offers and chats have been deleted.</Card>
          ) : r.offers.length === 0 ? (
            <Card className="py-12 text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-mint text-primary-dark"><Radar className="size-7" /></div>
              <p className="font-semibold">Waiting for offers</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{r._count.recipients} lab{r._count.recipients === 1 ? " has" : "s have"} received your request. This page updates automatically when someone replies.</p>
            </Card>
          ) : (
            <>
              {r.status === "COMPLETED" ? (
                <Card className="mb-4 space-y-4">
                  <p className="flex items-start gap-2 text-sm text-primary-dark">
                    <Coins className="mt-0.5 size-5 shrink-0" />
                    <span><strong>Booking completed{r.completedAt ? ` on ${formatDate(r.completedAt, true)}` : ""}.</strong> {r.coinsAwarded ? `You earned ${r.coinsAwarded} loyalty coin${r.coinsAwarded === 1 ? "" : "s"}.` : ""}</span>
                  </p>
                  {r.review ? (
                    <div className="rounded-xl bg-mint-soft p-3 text-sm">
                      <p className="mb-1 font-semibold">Your review of {completedOffer?.laboratory.name}</p>
                      <Stars value={r.review.rating} />
                      {r.review.comment ? <p className="mt-1">“{r.review.comment}”</p> : null}
                    </div>
                  ) : completedOffer ? <ReviewForm requestId={r.id} labName={completedOffer.laboratory.name} /> : null}
                </Card>
              ) : r.status === "ACCEPTED" ? (
                <p className="mb-4 flex items-start gap-2 rounded-2xl bg-mint p-4 text-sm text-primary-dark"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /> <span><strong>Offer accepted.</strong> The other offers and chats were deleted. The lab now has your contact details — use the chat to arrange your visit. You can send a new request any time.</span></p>
              ) : (
                <h2 className="mb-3 font-semibold">{r.offers.length} offer{r.offers.length === 1 ? "" : "s"} · lowest first</h2>
              )}
              {r.status === "OPEN" && r.offers.length > 1 ? <OfferComparison offers={r.offers.map((o) => ({ lab: o.laboratory.name, price: o.totalPrice }))} /> : null}
              <OffersWorkspace
                requestId={r.id}
                requestOpen={open}
                offers={r.offers.map((o) => ({
                  id: o.id, laboratoryId: o.laboratoryId, labSlug: o.laboratory.slug, rating: o.rating, labName: o.laboratory.name, verified: o.laboratory.verificationStatus === "VERIFIED",
                  accreditation: o.laboratory.accreditation, openingHours: o.laboratory.openingHours, phone: o.laboratory.phone,
                  totalPrice: o.totalPrice, homeCollectionAvailable: o.homeCollectionAvailable, reportTimeHours: o.reportTimeHours, note: o.note,
                  status: o.status, distanceKm: o.distanceKm, updatedAt: o.updatedAt.toISOString(), messageCount: o.messageCount,
                }))}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
