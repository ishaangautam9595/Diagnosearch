import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Camera, Mail, MapPin, Phone } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getRequestForAdmin } from "@/lib/services/admin-portal";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { Badge, Card } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Request" };

export default async function AdminRequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await getRequestForAdmin(id);
  if (!r) notFound();
  return (
    <>
      <Link href="/admin/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"><ArrowLeft className="size-4" /> All requests</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{r.reference}</h1><RequestStatusBadge status={r.status} />
        <span className="text-sm text-muted">Sent {formatDate(r.createdAt, true)}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Patient</h2>
          <p className="text-sm font-medium">{r.patient.name}</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            {r.patient.phone ? <span className="flex items-center gap-1"><Phone className="size-4" /> {r.patient.phone}</span> : null}
            {r.patient.email ? <span className="flex items-center gap-1"><Mail className="size-4" /> {r.patient.email}</span> : null}
          </div>
          <p className="flex gap-1.5 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0" /> {r.addressLine}, {r.city} {r.pincode}</p>
          <p className="text-sm">Collection: {r.service === "ANY" ? "Either" : r.service === "HOME_COLLECTION" ? "Home" : "Lab visit"}</p>
          {r.notes ? <p className="rounded-lg bg-mint-soft p-3 text-sm">{r.notes}</p> : null}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Requested</h2>
          {r.tests.length ? <ul className="space-y-1 text-sm">{r.tests.map((t) => <li key={t.id}>• {t.name}{!t.testId ? <Badge className="ml-2">custom</Badge> : null}</li>)}</ul> : <p className="text-sm text-muted">No tests listed.</p>}
          {r.images.length ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Camera className="size-4" /> Prescription</p>
              <div className="flex flex-wrap gap-2">
                {r.images.map((img, i) => (
                  <a key={img.id} href={`/api/prescriptions/${img.id}`} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/prescriptions/${img.id}`} alt={`Prescription page ${i + 1}`} loading="lazy" className="size-24 rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Offers ({r.offers.length})</h2>
          {r.offers.length === 0 ? <p className="text-sm text-muted">{r.status === "ACCEPTED" ? "Other offers were deleted when the patient accepted." : "No offers yet."}</p> : (
            <ul className="divide-y divide-border text-sm">
              {r.offers.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{o.laboratory.name} {o.status === "ACCEPTED" ? <Badge tone="green" className="ml-1">Accepted</Badge> : null}<span className="block text-xs text-muted">{o.messageCount} chat message{o.messageCount === 1 ? "" : "s"}</span></span>
                  <span className="tabular font-bold">{formatINR(o.totalPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Labs that received it ({r.recipients.length})</h2>
          <ul className="divide-y divide-border text-sm">
            {r.recipients.length === 0 ? <li className="text-muted">{r.status === "OPEN" ? `No lab within ${r.radiusKm} km.` : "Recipients are cleared when a request closes."}</li> : r.recipients.map((x) => (
              <li key={x.id} className="flex justify-between py-2"><span>{x.laboratory.name}</span><span className="text-muted">{x.distanceKm} km · {x.firstSeenAt ? "seen" : "not seen yet"}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
