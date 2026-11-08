import type { Metadata } from "next";
import { Mail, MapPin, Phone, Trophy } from "lucide-react";
import { requireLabPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompleteRequestButton } from "@/components/lab/complete-request-button";
import { Stars } from "@/components/reviews/stars";
import { coinsForAmount } from "@/lib/services/loyalty";
import { EmptyState, RequestStatusBadge } from "@/components/dashboard/bits";
import { Card, PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Won bookings" };

export default async function WonPage() {
  const me = await requireLabPage();
  const rows = await db.testRequest.findMany({
    where: { acceptedLabId: me.laboratoryId! }, orderBy: { acceptedAt: "desc" }, take: 100,
    select: {
      id: true, reference: true, status: true, acceptedAt: true, coinsAwarded: true, review: { select: { rating: true } }, addressLine: true, city: true, pincode: true, service: true,
      patient: { select: { name: true, phone: true, email: true } }, tests: { select: { name: true } },
      offers: { where: { laboratoryId: me.laboratoryId!, status: "ACCEPTED" }, select: { totalPrice: true } },
    },
  });
  return (
    <>
      <PageHeading title="Won bookings" subtitle="Patients who accepted your offer. Their full details are shown here." />
      {rows.length === 0 ? <EmptyState icon={<Trophy className="size-6" />} title="No wins yet" text="When a patient accepts your offer it appears here with their contact details." /> : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="flex items-center gap-2 font-mono text-sm font-bold">{r.reference} <RequestStatusBadge status={r.status} won /></p><p className="text-xs text-muted">Accepted {r.acceptedAt ? formatDate(r.acceptedAt, true) : ""}</p></div>
                <p className="tabular text-2xl font-bold">{formatINR(r.offers[0]?.totalPrice)}</p>
              </div>
              <p className="text-sm">{r.tests.map((t) => t.name).join(", ") || "Prescription"}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span className="font-semibold">{r.patient.name}</span>
                {r.patient.phone ? <a className="flex items-center gap-1 text-primary-dark" href={`tel:+91${r.patient.phone}`}><Phone className="size-4" /> {r.patient.phone}</a> : null}
                {r.patient.email ? <a className="flex items-center gap-1 text-primary-dark" href={`mailto:${r.patient.email}`}><Mail className="size-4" /> {r.patient.email}</a> : null}
              </div>
              <p className="flex gap-1.5 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0" /> {r.addressLine}, {r.city} {r.pincode}</p>
              {r.status === "COMPLETED" ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{r.coinsAwarded ?? 0} coins sent to patient · {r.review ? <Stars value={r.review.rating} /> : "awaiting review"}</p>
              ) : null}
              <div className="flex flex-wrap items-start gap-2">
                <Button asChild variant="outline" size="sm"><Link href={`/lab/requests/${r.id}`}>Open chat &amp; prescription</Link></Button>
                {r.status === "ACCEPTED" ? <CompleteRequestButton requestId={r.id} coins={coinsForAmount(Number(r.offers[0]?.totalPrice ?? 0))} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
