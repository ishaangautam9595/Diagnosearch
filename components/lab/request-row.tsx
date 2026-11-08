import Link from "next/link";
import { Camera, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/utils";
import type { RequestStatus } from "@/generated/prisma/client";

export interface LabRequestRow {
  id: string; reference: string; status: RequestStatus; createdAt: Date; patientFirstName: string; city: string; distanceKm: number;
  tests: { name: string }[]; _count: { images: number }; isNew: boolean; wonByMe: boolean; myOffer: { totalPrice: number; status: string } | null;
}

export function LabRequestRowCard({ r }: { r: LabRequestRow }) {
  const names = r.tests.map((t) => t.name);
  return (
    <Link href={`/lab/requests/${r.id}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold">{r.reference}</span>
          {r.isNew ? <Badge tone="amber">New</Badge> : null}
          <RequestStatusBadge status={r.status} won={r.wonByMe} />
          <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
        </div>
        <p className="truncate text-sm">
          {r._count.images > 0 ? <span className="mr-2 inline-flex items-center gap-1 text-muted"><Camera className="size-3.5" /> Prescription</span> : null}
          {names.slice(0, 3).join(", ")}{names.length > 3 ? ` +${names.length - 3} more` : ""}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" /> {r.patientFirstName} · {r.city} · {r.distanceKm} km away</p>
      </div>
      <div className="text-right text-sm">
        {r.myOffer ? <><p className="text-xs text-muted">{r.myOffer.status === "ACCEPTED" ? "Won at" : "Your offer"}</p><p className="tabular font-bold">{formatINR(r.myOffer.totalPrice)}</p></> : r.status === "OPEN" ? <Badge tone="blue">Send offer</Badge> : null}
      </div>
      <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
