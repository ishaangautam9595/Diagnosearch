"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock, Home, MapPin, MessageCircle, Phone, ShieldQuestion, Trophy } from "lucide-react";
import Link from "next/link";
import { RatingBadge } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { acceptOfferAction } from "@/app/app/actions";
import { formatINR } from "@/lib/money";
import { formatTurnaround, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface OfferView {
  id: string; laboratoryId: string; labSlug: string; rating: { average: number | null; count: number }; labName: string; verified: boolean; accreditation: string | null; openingHours: string | null; phone: string;
  totalPrice: number; homeCollectionAvailable: boolean; reportTimeHours: number | null; note: string | null;
  status: "SENT" | "ACCEPTED"; distanceKm: number | null; updatedAt: string; messageCount: number;
}

/** Offers on the left (lowest first), chat with the selected lab on the right. Accepting deletes every other offer and chat. */
export function OffersWorkspace({ requestId, requestOpen, offers }: { requestId: string; requestOpen: boolean; offers: OfferView[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(offers[0]?.laboratoryId ?? null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const lowest = offers.length > 1 ? Math.min(...offers.map((o) => o.totalPrice)) : null;
  const active = offers.find((o) => o.laboratoryId === selected) ?? offers[0];

  const accept = (offerId: string) => {
    setError(null);
    start(async () => {
      const res = await acceptOfferAction(offerId);
      if (res.ok) { setConfirming(null); router.refresh(); } else setError(res.error ?? "Couldn't accept this offer.");
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <ul className="space-y-3" aria-label="Offers">
        {offers.map((o) => {
          const won = o.status === "ACCEPTED";
          return (
            <li key={o.id}>
              <div onClick={() => setSelected(o.laboratoryId)}
                className={cn("cursor-pointer rounded-2xl border bg-white p-4 transition-shadow", active?.id === o.id ? "border-primary-dark shadow-sm ring-1 ring-primary-dark" : "border-border hover:shadow-sm")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {won ? <Badge tone="green"><Trophy className="size-3" /> Accepted</Badge> : null}
                      {lowest !== null && o.totalPrice === lowest && !won ? <Badge tone="blue">Lowest price</Badge> : null}
                      {o.verified ? <Badge tone="green"><BadgeCheck className="size-3" /> Verified lab</Badge> : <Badge><ShieldQuestion className="size-3" /> Not yet verified</Badge>}
                    </div>
                    <h3 className="text-lg font-bold">{o.labName}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3" onClick={(e) => e.stopPropagation()}>
                      <RatingBadge average={o.rating.average} count={o.rating.count} />
                      <Link href={`/labs/${o.labSlug}`} target="_blank" className="text-xs font-medium text-primary-dark hover:underline">Lab details &amp; reviews</Link>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      {o.distanceKm !== null ? <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {o.distanceKm} km away</span> : null}
                      <span>Offer {timeAgo(o.updatedAt)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Total offer</p>
                    <p className="tabular text-3xl font-bold" data-testid="offer-price">{formatINR(o.totalPrice)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1"><Home className="size-4" /> {o.homeCollectionAvailable ? "Home collection" : "Lab visit only"}</span>
                  <span className="flex items-center gap-1"><Clock className="size-4" /> Reports: {o.reportTimeHours ? `within ${formatTurnaround(o.reportTimeHours)}` : "not specified"}</span>
                  {won ? <a className="flex items-center gap-1 font-medium text-primary-dark" href={`tel:${o.phone.replace(/\s/g, "")}`}><Phone className="size-4" /> {o.phone}</a> : null}
                </div>
                {o.note ? <p className="mt-3 rounded-xl bg-mint-soft p-3 text-sm">“{o.note}”</p> : null}
                {o.accreditation && o.verified ? <p className="mt-2 text-xs text-muted">Accreditation: {o.accreditation}</p> : null}

                <div className="mt-4 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(o.laboratoryId)}><MessageCircle className="size-4" /> Chat{o.messageCount ? ` (${o.messageCount})` : ""}</Button>
                  {requestOpen && !won ? (
                    confirming === o.id ? null : <Button type="button" size="sm" onClick={() => setConfirming(o.id)}><CheckCircle2 className="size-4" /> Accept offer</Button>
                  ) : null}
                </div>
                {confirming === o.id ? (
                  <div role="alertdialog" aria-label="Confirm accepting this offer" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <p className="font-semibold text-[#7a4900]">Accept {o.labName}&apos;s offer of {formatINR(o.totalPrice)}?</p>
                    <p className="mt-1 text-[#7a4900]">
                      {offers.length > 1 ? `The other ${offers.length - 1} offer${offers.length > 2 ? "s" : ""} and their chats will be permanently deleted. ` : ""}
                      {o.labName} will receive your contact details and address.
                    </p>
                    {error ? <p role="alert" className="mt-2 font-medium text-danger">{error}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" onClick={() => accept(o.id)} disabled={pending}>{pending ? "Accepting…" : "Yes, accept"}</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(null)} disabled={pending}>Not yet</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div>
        {active ? (
          <ChatPanel key={active.laboratoryId} requestId={requestId} laboratoryId={active.laboratoryId} me="PATIENT"
            title={active.labName} subtitle={active.openingHours ? `Open: ${active.openingHours}` : "Chat about this offer"} canWriteInitially={requestOpen || active.status === "ACCEPTED"} />
        ) : null}
      </div>
    </div>
  );
}
