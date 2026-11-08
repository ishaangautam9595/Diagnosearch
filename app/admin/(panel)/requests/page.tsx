import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { listRequestsForAdmin } from "@/lib/services/admin-portal";
import type { RequestStatus } from "@/generated/prisma/client";
import { PageHeading } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/dashboard/bits";
import { Pager, TableShell, td, th } from "@/components/admin/bits";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Requests" };
const STATUSES: RequestStatus[] = ["OPEN", "ACCEPTED", "COMPLETED", "CANCELLED"];

export default async function AdminRequestsPage({ searchParams }: PageProps<"/admin/requests">) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = (STATUSES as string[]).includes(String(sp.status)) ? (sp.status as RequestStatus) : undefined;
  const page = Math.max(parseInt(String(sp.page ?? "1"), 10) || 1, 1);
  const data = await listRequestsForAdmin({ status, page });
  const tab = (active: boolean) => cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", active ? "border-primary-dark bg-primary-dark text-white" : "border-border bg-white hover:bg-mint");
  return (
    <>
      <PageHeading title="Patient requests" subtitle={`${data.total} ${status ? status.toLowerCase() : "total"}`} />
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/requests" className={tab(!status)}>All</Link>
        {STATUSES.map((s) => <Link key={s} href={`/admin/requests?status=${s}`} className={tab(status === s)}>{s.charAt(0) + s.slice(1).toLowerCase()}</Link>)}
      </nav>
      <TableShell>
        <thead className="border-b border-border bg-mint-soft"><tr><th className={th}>Reference</th><th className={th}>Patient</th><th className={th}>City</th><th className={th}>Content</th><th className={th}>Labs reached</th><th className={th}>Offers</th><th className={th}>Status</th></tr></thead>
        <tbody className="divide-y divide-border">
          {data.rows.length === 0 ? <tr><td className={td} colSpan={7}>No requests.</td></tr> : data.rows.map((r) => (
            <tr key={r.id}>
              <td className={td}><Link href={`/admin/requests/${r.id}`} className="font-mono font-semibold text-primary-dark hover:underline">{r.reference}</Link><div className="text-xs text-muted">{formatDate(r.createdAt, true)}</div></td>
              <td className={td}>{r.patient.name}</td><td className={td}>{r.city}</td>
              <td className={`${td} text-muted`}>{r._count.images} image{r._count.images === 1 ? "" : "s"} · {r._count.tests} test{r._count.tests === 1 ? "" : "s"}</td>
              <td className={`${td} tabular`}>{r._count.recipients}</td><td className={`${td} tabular`}>{r._count.offers}</td>
              <td className={td}><RequestStatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <Pager page={data.page} pageCount={data.pageCount} hrefFor={(p) => `/admin/requests?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`} />
    </>
  );
}
