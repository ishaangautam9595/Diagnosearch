import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listApplications } from "@/lib/services/partner";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { formatDate } from "@/lib/utils";
import { reviewApplicationAction } from "../actions";

export const metadata: Metadata = { title: "Lab applications" };

export default async function ApplicationsPage() {
  await requireAdminPage(["ADMIN"]);
  const apps = await listApplications();
  const pending = apps.filter((a) => a.approvalStatus === "PENDING");
  const reviewed = apps.filter((a) => a.approvalStatus !== "PENDING");
  return (
    <>
      <PageHeading title="Lab partner applications" subtitle="Self-registered laboratories stay hidden from patients until you approve them." />
      <h2 className="mb-3 font-semibold">Needs review ({pending.length})</h2>
      <div className="space-y-4">
        {pending.length === 0 ? <p className="text-sm text-muted">No applications waiting.</p> : pending.map((a) => (
          <Card key={a.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{a.name} {a.isDemo ? <Badge tone="amber">DEMO</Badge> : null}</h3>
                <p className="text-xs text-muted">Applied {formatDate(a.createdAt, true)} · {a.contactPerson}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link href={`/admin/laboratories/${a.id}`}>Open &amp; edit details</Link></Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1"><Phone className="size-4" /> {a.phone}</span>
              {a.email ? <span className="flex items-center gap-1"><Mail className="size-4" /> {a.email}</span> : null}
              <span>Home collection: {a.homeCollectionAvailable ? "yes" : "no"}</span>
            </div>
            <ul className="space-y-1 text-sm">
              {a.addresses.map((ad) => (
                <li key={ad.id} className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary-dark" />
                  <span>{ad.label ? <strong>{ad.label}: </strong> : null}{ad.line1}{ad.line2 ? `, ${ad.line2}` : ""}, {ad.city} {ad.pincode}
                    {ad.latitude !== null ? <a className="ml-2 text-primary-dark underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${ad.latitude}&mlon=${ad.longitude}#map=17/${ad.latitude}/${ad.longitude}`}>view pin</a> : null}
                  </span></li>
              ))}
            </ul>
            {a.accreditation ? <p className="text-sm"><span className="text-muted">Claimed accreditation (unverified):</span> {a.accreditation}</p> : null}
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <ActionForm action={reviewApplicationAction.bind(null, a.id, "APPROVE")}>
                <SubmitButton pendingText="Approving…">Approve &amp; publish</SubmitButton>
                <p className="mt-1 text-xs text-muted">Goes live as unverified. Verify it from the lab page.</p>
              </ActionForm>
              <ActionForm action={reviewApplicationAction.bind(null, a.id, "REJECT")} className="flex items-start gap-2">
                <Input name="reason" placeholder="Reason for rejecting" aria-label="Reason for rejecting" required />
                <SubmitButton variant="outline" pendingText="…">Reject</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ))}
      </div>
      {reviewed.length ? (
        <>
          <h2 className="mb-3 mt-8 font-semibold">Reviewed</h2>
          <div className="space-y-2">
            {reviewed.map((a) => (
              <Card key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span><Link className="font-semibold hover:underline" href={`/admin/laboratories/${a.id}`}>{a.name}</Link>{a.rejectionReason ? <span className="text-muted"> — {a.rejectionReason}</span> : null}</span>
                <Badge tone={a.approvalStatus === "APPROVED" ? "green" : "red"}>{a.approvalStatus === "APPROVED" ? "Approved" : "Rejected"}</Badge>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
