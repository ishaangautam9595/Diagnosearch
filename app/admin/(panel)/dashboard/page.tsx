import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/admin";
import { PageHeading } from "@/components/ui/card";
import { StatCard, RequestStatusBadge } from "@/components/dashboard/bits";
import { TableShell, td, th } from "@/components/admin/bits";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();
  const s = await getDashboardStats();
  return (
    <>
      <PageHeading title="Dashboard" subtitle="How the marketplace is doing right now." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Patients" value={s.patients} />
        <StatCard label="Approved labs" value={s.labs} hint={`${s.activeLabs} active`} />
        <StatCard label="Applications to review" value={s.pendingApplications} tone={s.pendingApplications ? "highlight" : undefined} />
        <StatCard label="Catalogue tests" value={s.tests} />
        <StatCard label="Requests sent" value={s.requests} />
        <StatCard label="Open requests" value={s.open} hint="Waiting for a decision" />
        <StatCard label="Offers accepted" value={s.wonOffers} hint={`${s.acceptedRequests} requests closed`} />
        <StatCard label="Value of accepted offers" value={formatINR(s.wonValue)} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Recent requests</h2>
      <TableShell>
        <thead className="border-b border-border bg-mint-soft"><tr><th className={th}>Reference</th><th className={th}>Patient</th><th className={th}>City</th><th className={th}>Labs reached</th><th className={th}>Offers</th><th className={th}>Status</th><th className={th}>Sent</th></tr></thead>
        <tbody className="divide-y divide-border">
          {s.recent.length === 0 ? <tr><td className={td} colSpan={7}>No requests yet.</td></tr> : s.recent.map((r) => (
            <tr key={r.id}>
              <td className={td}><Link className="font-mono font-semibold text-primary-dark hover:underline" href={`/admin/requests/${r.id}`}>{r.reference}</Link></td>
              <td className={td}>{r.patient.name}</td><td className={td}>{r.city}</td>
              <td className={`${td} tabular`}>{r._count.recipients}</td><td className={`${td} tabular`}>{r._count.offers}</td>
              <td className={td}><RequestStatusBadge status={r.status} /></td>
              <td className={`${td} text-muted`}>{formatDate(r.createdAt, true)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </>
  );
}
