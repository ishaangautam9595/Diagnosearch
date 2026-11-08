import type { Metadata } from "next";
import { BadgeCheck, Clock, Home, Mail, MapPin, Phone, ShieldQuestion } from "lucide-react";
import { ChangePasswordCard } from "@/components/dashboard/change-password-form";
import { requireLabPage } from "@/lib/auth";
import { getLabOverview } from "@/lib/services/lab-portal";
import Link from "next/link";
import { RatingBadge } from "@/components/reviews/stars";
import { getRatingSummaries } from "@/lib/services/loyalty";
import { Badge, Card, PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Lab profile" };

export default async function LabProfilePage() {
  const me = await requireLabPage();
  const { lab } = await getLabOverview(me.laboratoryId!);
  if (!lab) return null;
  const rating = (await getRatingSummaries([lab.id])).get(lab.id)!;
  return (
    <>
      <PageHeading title="Lab profile" subtitle="This is the information our team has on file. Contact support to change it." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={lab.approvalStatus === "APPROVED" ? "green" : lab.approvalStatus === "PENDING" ? "amber" : "red"}>{lab.approvalStatus === "APPROVED" ? "Approved" : lab.approvalStatus === "PENDING" ? "Pending approval" : "Rejected"}</Badge>
            {lab.verificationStatus === "VERIFIED" ? <Badge tone="green"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge><ShieldQuestion className="size-3" /> Not yet verified</Badge>}
            {lab.homeCollectionAvailable ? <Badge tone="blue"><Home className="size-3" /> Home collection</Badge> : null}
          </div>
          <h2 className="text-xl font-bold">{lab.name}</h2>
          <p className="flex flex-wrap items-center gap-3"><RatingBadge average={rating.average} count={rating.count} /><Link href={`/labs/${lab.slug}`} target="_blank" className="text-xs font-medium text-primary-dark hover:underline">View your public page &amp; reviews</Link></p>
          {lab.description ? <p className="text-sm text-muted">{lab.description}</p> : null}
          <p className="flex gap-2 text-sm"><Phone className="size-4 shrink-0 text-primary-dark" /> {lab.phone}{lab.whatsapp ? ` · WhatsApp ${lab.whatsapp}` : ""}</p>
          {lab.email ? <p className="flex gap-2 text-sm"><Mail className="size-4 shrink-0 text-primary-dark" /> {lab.email}</p> : null}
          <p className="flex gap-2 text-sm"><Clock className="size-4 shrink-0 text-primary-dark" /> {lab.openingHours ?? "Opening hours not provided"}</p>
          {lab.accreditation ? <p className="text-sm"><span className="text-muted">Accreditation:</span> {lab.accreditation}</p> : null}
          {lab.contactPerson ? <p className="text-sm"><span className="text-muted">Contact person:</span> {lab.contactPerson}</p> : null}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Branches ({lab.addresses.length})</h2>
          <p className="text-sm text-muted">You receive requests from patients within 20 km of any branch.</p>
          <ul className="space-y-3">
            {lab.addresses.map((a) => (
              <li key={a.id} className="flex gap-2 rounded-xl bg-mint-soft p-3 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary-dark" />
                <span>{a.label ? <strong>{a.label}: </strong> : null}{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</span></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6"><ChangePasswordCard /></div>
    </>
  );
}
