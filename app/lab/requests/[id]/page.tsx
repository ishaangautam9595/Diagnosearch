import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Camera, CheckCheck, Lock, MapPin, Phone, Trophy } from "lucide-react";
import { requireLabPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLabRequest } from "@/lib/services/lab-portal";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { CompleteRequestButton } from "@/components/lab/complete-request-button";
import { Stars } from "@/components/reviews/stars";
import { coinsForAmount } from "@/lib/services/loyalty";
import { OfferForm } from "@/components/lab/offer-form";
import { PatientDistanceMap } from "@/components/lab/patient-distance-map";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Request" };

export default async function LabRequestPage({ params }: PageProps<"/lab/requests/[id]">) {
  const me = await requireLabPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [r, lab] = await Promise.all([getLabRequest(me.laboratoryId!, id), db.laboratory.findUnique({ where: { id: me.laboratoryId! }, select: { homeCollectionAvailable: true, isActive: true, approvalStatus: true } })]);
  if (!r || !lab) {
    return (
      <Card className="py-14 text-center">
        <Lock className="mx-auto mb-3 size-8 text-muted" />
        <p className="font-semibold">This request is no longer available</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">The patient may have accepted another lab&apos;s offer or cancelled the request.</p>
        <Link href="/lab/requests" className="mt-4 inline-block font-semibold text-primary-dark hover:underline">Back to requests</Link>
      </Card>
    );
  }
  const open = r.status === "OPEN";
  const live = lab.isActive && lab.approvalStatus === "APPROVED";
  return (
    <>
      {open ? <AutoRefresh seconds={20} /> : null}
      <Link href="/lab/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"><ArrowLeft className="size-4" /> Requests</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{r.reference}</h1>
        <RequestStatusBadge status={r.status} won={r.wonByMe} />
        <span className="text-sm text-muted">Received {formatDate(r.createdAt, true)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-semibold">What the patient needs</h2>
            {r.tests.length ? <ul className="space-y-1 text-sm">{r.tests.map((t) => <li key={t.id}>• {t.name}</li>)}</ul> : <p className="text-sm text-muted">See the prescription below.</p>}
            {r.images.length ? (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Camera className="size-4" /> Prescription ({r.images.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {r.images.map((img, i) => (
                    <a key={img.id} href={`/api/prescriptions/${img.id}`} target="_blank" rel="noreferrer" aria-label={`Open prescription page ${i + 1} full size`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/prescriptions/${img.id}`} alt={`Prescription page ${i + 1}`} loading="lazy" className="w-full rounded-xl border border-border" />
                    </a>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Click an image to open it full size.</p>
              </div>
            ) : null}
            {r.notes ? <p className="rounded-xl bg-mint-soft p-3 text-sm">Patient note: {r.notes}</p> : null}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Collection preference</dt><dd>{r.service === "ANY" ? "Either" : r.service === "HOME_COLLECTION" ? "Home collection" : "Patient will visit the lab"}</dd></div>
              <div><dt className="text-xs text-muted">Patient</dt><dd className="font-semibold">{r.patient.name}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted">{r.patient.revealed ? "Address" : "Area"}</dt><dd className="flex gap-1"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {r.patient.address}</dd></div>
              {r.patient.revealed ? <div className="sm:col-span-2"><dt className="text-xs text-muted">Contact</dt><dd className="flex flex-wrap gap-4">{r.patient.phone ? <a className="flex items-center gap-1 text-primary-dark" href={`tel:+91${r.patient.phone}`}><Phone className="size-4" /> {r.patient.phone}</a> : null}{r.patient.email ? <span>{r.patient.email}</span> : null}</dd></div> : <p className="text-xs text-muted sm:col-span-2">Full name, contact details and exact address are shared if the patient accepts your offer.</p>}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Where the patient is</h2>
            <PatientDistanceMap location={r.location} branches={r.branches} patientLabel={r.patient.revealed ? r.patient.name : `${r.patient.name} (approximate)`} />
          </Card>

          <Card>
            {r.wonByMe ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-sm"><Trophy className="mt-0.5 size-5 shrink-0 text-primary-dark" /> <span><strong>You won this booking at {formatINR(r.offer?.totalPrice)}.</strong> {r.status === "COMPLETED" ? "" : "Contact the patient to arrange the visit, then mark it completed once the service is done."}</span></p>
                {r.status === "ACCEPTED" ? <CompleteRequestButton requestId={r.id} coins={coinsForAmount(r.offer?.totalPrice ?? 0)} /> : null}
                {r.status === "COMPLETED" ? (
                  <div className="rounded-xl bg-mint p-3 text-sm text-primary-dark">
                    <p className="flex items-center gap-1.5 font-semibold"><CheckCheck className="size-4" /> Completed {r.completedAt ? formatDate(r.completedAt, true) : ""} · {r.coinsAwarded ?? 0} loyalty coins sent to the patient</p>
                    {r.review ? (
                      <div className="mt-2 text-foreground"><Stars value={r.review.rating} />{r.review.comment ? <p className="mt-1">“{r.review.comment}”</p> : null}</div>
                    ) : <p className="mt-1 text-xs">The patient hasn&apos;t left a review yet.</p>}
                  </div>
                ) : null}
              </div>
            ) : open && live ? (
              <>
                <h2 className="mb-3 font-semibold">{r.offer ? "Your offer" : "Send your best price"}</h2>
                <OfferForm requestId={r.id} existing={r.offer} homeDefault={lab.homeCollectionAvailable} />
              </>
            ) : <p className="text-sm text-muted">{open ? "Your laboratory must be approved before you can send offers." : "This request is closed."}</p>}
          </Card>
        </div>
        <div>
          <ChatPanel requestId={r.id} laboratoryId={me.laboratoryId!} me="LAB" title={`Chat with ${r.patient.name}`} subtitle={`${r.reference} · ${r.distanceKm} km away`} canWriteInitially={open || (r.wonByMe && r.status === "ACCEPTED")} />
        </div>
      </div>
    </>
  );
}
