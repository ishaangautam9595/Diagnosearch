import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ClipboardList } from "lucide-react";
import { requirePatientPage } from "@/lib/auth";
import { listPatientRequests } from "@/lib/services/requests";
import { EmptyState } from "@/components/dashboard/bits";
import { RequestCard } from "@/components/patient/request-card";
import { PatientDashboard } from "@/components/patient/patient-dashboard";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Overview" };

export default async function PatientOverview() {
  const me = await requirePatientPage();
  const requests = await listPatientRequests(me.id);
  return (
    <>
      <AutoRefresh seconds={60} />
      <PatientDashboard name={me.name.split(" ")[0]} />
      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="font-semibold">Recent requests</h2>
        <Link href="/app/requests" className="flex items-center gap-1 text-sm font-semibold text-primary-dark hover:underline">View all <ArrowRight className="size-4" /></Link>
      </div>
      {requests.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-6" />} title="No requests yet" text="Send your first request and nearby labs will reply with offers." action={<Button asChild><Link href="/app/requests/new">Create a request</Link></Button>} />
      ) : (
        <div className="space-y-3">{requests.slice(0, 5).map((r) => <RequestCard key={r.id} r={r} />)}</div>
      )}
    </>
  );
}
