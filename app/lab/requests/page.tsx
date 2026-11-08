import Link from "next/link";
import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requireLabPage } from "@/lib/auth";
import { listLabRequests, type LabRequestFilter } from "@/lib/services/lab-portal";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { EmptyState } from "@/components/dashboard/bits";
import { LabRequestRowCard } from "@/components/lab/request-row";
import { PageHeading } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requests" };
const TABS: { key: LabRequestFilter; label: string }[] = [{ key: "new", label: "Needs your offer" }, { key: "quoted", label: "Offer sent" }, { key: "won", label: "Won" }, { key: "all", label: "All" }];

export default async function LabRequestsPage({ searchParams }: PageProps<"/lab/requests">) {
  const me = await requireLabPage();
  const sp = await searchParams;
  const filter = (TABS.find((t) => t.key === sp.filter)?.key ?? "new") as LabRequestFilter;
  const rows = await listLabRequests(me.laboratoryId!, filter);
  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHeading title="Requests" subtitle="Patient requests within 20 km of your branches." />
      <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => <Link key={t.key} href={`/lab/requests?filter=${t.key}`} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", filter === t.key ? "border-primary-dark bg-primary-dark text-white" : "border-border bg-white hover:bg-mint")}>{t.label}</Link>)}
      </nav>
      {rows.length === 0 ? <EmptyState icon={<Inbox className="size-6" />} title="Nothing here" text={filter === "new" ? "You're all caught up. New requests appear here automatically." : "No requests in this view yet."} /> : <div className="space-y-3">{rows.map((r) => <LabRequestRowCard key={r.id} r={r} />)}</div>}
    </>
  );
}
