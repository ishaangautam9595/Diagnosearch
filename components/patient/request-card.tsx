import Link from "next/link";
import { Camera, ChevronRight, Coins, FlaskConical, Radar, Star, Store } from "lucide-react";
import { RequestJourney } from "./request-journey";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { Badge } from "@/components/ui/card";
import { Stars } from "@/components/reviews/stars";
import { formatINR } from "@/lib/money";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { RequestStatus } from "@/generated/prisma/client";

export interface RequestCardData {
  id: string; reference: string; status: RequestStatus; createdAt: Date; lowest: number | null;
  tests: { name: string }[]; _count: { images: number; offers: number; recipients: number };
  labName?: string | null; paid?: number | null; coinsAwarded?: number | null; completedAt?: Date | null; review?: { rating: number } | null;
}

const ACCENT: Record<RequestStatus, string> = { OPEN: "bg-sky-400", ACCEPTED: "bg-primary-dark", COMPLETED: "bg-emerald-500", CANCELLED: "bg-slate-300" };

/** One request: status accent bar, tests as chips, the lab/price that matters for its stage, and the next action. */
export function RequestCard({ r }: { r: RequestCardData }) {
  const names = r.tests.map((t) => t.name);
  const hasOffers = r.status === "OPEN" && r._count.offers > 0;
  const needsReview = r.status === "COMPLETED" && !r.review;
  return (
    <Link href={`/app/requests/${r.id}`} className={cn("group relative flex items-stretch overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary-dark", hasOffers || needsReview ? "border-primary/50" : "border-border", r.status === "CANCELLED" && "opacity-80")}>
      <span aria-hidden className={cn("w-1.5 shrink-0", ACCENT[r.status])} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold">{r.reference}</span>
            <RequestStatusBadge status={r.status} />
            <span className="text-xs text-muted" title={formatDate(r.createdAt, true)}>{timeAgo(r.createdAt)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {r._count.images > 0 ? <Badge><Camera className="size-3" /> {r._count.images} prescription{r._count.images === 1 ? "" : "s"}</Badge> : null}
            {names.slice(0, 3).map((n) => <span key={n} className="inline-flex max-w-48 items-center gap-1 truncate rounded-full border border-border bg-mint-soft px-2.5 py-0.5 text-xs"><FlaskConical className="size-3 shrink-0 text-primary-dark" /> <span className="truncate">{n}</span></span>)}
            {names.length > 3 ? <span className="text-xs text-muted">+{names.length - 3} more</span> : null}
            {!names.length && !r._count.images ? <span className="text-sm text-muted">—</span> : null}
          </div>
          {r.labName ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 font-medium"><Store className="size-4 text-primary-dark" /> {r.labName}</span>
              {r.status === "COMPLETED" && r.review ? <Stars value={r.review.rating} /> : null}
              {r.status === "COMPLETED" && r.coinsAwarded ? <span className="flex items-center gap-1 text-xs font-semibold text-[#8a5300]"><Coins className="size-3.5" /> +{r.coinsAwarded} coins</span> : null}
            </p>
          ) : null}
        </div>

        <div className="hidden w-40 shrink-0 lg:block"><RequestJourney status={r.status} offers={r._count.offers} compact /></div>

        <div className="shrink-0 text-sm sm:w-36 sm:text-right">
          {r.status === "OPEN" ? (
            hasOffers ? (
              <><p className="font-bold text-primary-dark">{r._count.offers} offer{r._count.offers === 1 ? "" : "s"}</p><p className="text-xs text-muted">from {formatINR(r.lowest)}</p></>
            ) : <p className="flex items-center gap-1 text-xs text-muted sm:justify-end"><Radar className="size-3.5" /> Sent to {r._count.recipients} lab{r._count.recipients === 1 ? "" : "s"}</p>
          ) : r.paid != null ? (
            <><p className="tabular text-lg font-bold">{formatINR(r.paid)}</p>{r.status === "ACCEPTED" ? <p className="text-xs text-muted">Awaiting lab</p> : null}</>
          ) : null}
          {needsReview ? <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-[#8a5300]"><Star className="size-3" /> Rate your lab</p> : null}
        </div>
      </div>
      <ChevronRight aria-hidden className="mr-3 hidden size-4 shrink-0 self-center text-muted transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
