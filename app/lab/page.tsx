import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Building2, Home, Inbox, ShieldQuestion } from "lucide-react";
import { requireLabPage } from "@/lib/auth";
import { getLabOverview } from "@/lib/services/lab-portal";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { EmptyState } from "@/components/dashboard/bits";
import { LabOverviewDashboard } from "@/components/lab/overview-dashboard";
import { LabRequestRowCard } from "@/components/lab/request-row";
import { Reveal } from "@/components/site/motion";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date())) % 24;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function LabOverview() {
  const me = await requireLabPage();
  const o = await getLabOverview(me.laboratoryId!);
  const lab = o.lab;
  const chip = "inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur";
  return (
    <>
      <AutoRefresh seconds={60} />
      <Reveal>
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b5d6b] via-primary-dark to-primary p-7 text-white sm:p-10">
          <div aria-hidden className="ds-float-slow absolute -right-16 -top-20 size-80 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="ds-float absolute -bottom-24 right-40 size-64 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">{greeting()},</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{lab?.name}</h1>
            <p className="mt-3 max-w-xl text-base text-white/85">Patients within 20 km of your branches send you prescriptions and test lists. Reply with your best price to win the booking.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {lab?.verificationStatus === "VERIFIED" ? <span className={chip}><BadgeCheck className="size-3.5" /> Verified lab</span> : <span className={chip}><ShieldQuestion className="size-3.5" /> Verification pending</span>}
              <span className={chip}><Building2 className="size-3.5" /> {lab?.addresses.length ?? 0} branch{lab?.addresses.length === 1 ? "" : "es"}</span>
              {lab?.homeCollectionAvailable ? <span className={chip}><Home className="size-3.5" /> Home collection</span> : null}
            </div>
          </div>
        </div>
      </Reveal>

      <LabOverviewDashboard />

      <div className="mb-4 mt-10 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Latest requests</h2>
        <Link href="/lab/requests" className="flex items-center gap-1 text-sm font-semibold text-primary-dark hover:underline">View all <ArrowRight className="size-4" /></Link>
      </div>
      {o.recent.length === 0 ? <EmptyState icon={<Inbox className="size-6" />} title="No requests yet" text="New patient requests within 20 km of your branches will show up here." /> : <div className="space-y-3">{o.recent.map((r) => <LabRequestRowCard key={r.id} r={r} />)}</div>}
    </>
  );
}
