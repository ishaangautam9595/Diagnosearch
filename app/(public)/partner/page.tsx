import { Suspense } from "react";
import type { Metadata } from "next";
import { BadgeCheck, Handshake, Inbox, LayoutDashboard } from "lucide-react";
import { PartnerForm } from "@/components/patient/partner-form";
import { Skeleton } from "@/components/ui/card";
import { getDefaultMapCenter } from "@/lib/services/map-defaults";

export const metadata: Metadata = { title: "Become a lab partner" };

async function FormLoader() {
  return <PartnerForm center={await getDefaultMapCenter()} />;
}

export default function PartnerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-primary-dark"><Handshake className="size-3.5" /> For diagnostic laboratories</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Become a lab partner</h1>
      <p className="mt-2 max-w-2xl text-muted">Tell us about your laboratory. Once approved, you&apos;ll get patient requests from within 20 km of each of your branches and reply with your best price. We review every application before anything goes live.</p>
      <ul className="my-6 grid gap-3 sm:grid-cols-3">
        {[
          { i: Inbox, t: "Requests come to you", d: "Prescriptions and test lists from patients within 20 km." },
          { i: BadgeCheck, t: "You set the price", d: "Quote per request — no price lists to maintain." },
          { i: LayoutDashboard, t: "Your own dashboard", d: "Sign in to see requests, chat with patients and track wins." },
        ].map((b) => (
          <li key={b.t} className="rounded-2xl border border-border bg-white p-4"><b.i className="mb-2 size-5 text-primary-dark" /><p className="font-semibold">{b.t}</p><p className="text-sm text-muted">{b.d}</p></li>
        ))}
      </ul>
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-96" /></div>}><FormLoader /></Suspense>
    </div>
  );
}
