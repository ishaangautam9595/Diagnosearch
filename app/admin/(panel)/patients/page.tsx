import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { listPatients } from "@/lib/services/admin-portal";
import { Badge, PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager, TableShell, td, th } from "@/components/admin/bits";
import { formatDate } from "@/lib/utils";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { setPatientActiveAction } from "../actions";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: PageProps<"/admin/patients">) {
  await requireAdminPage(["ADMIN"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(parseInt(String(sp.page ?? "1"), 10) || 1, 1);
  const data = await listPatients({ q, page });
  return (
    <>
      <PageHeading title="Patients" subtitle={`${data.total} registered`} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search patients" className="h-10 w-full max-w-sm rounded-xl border border-border bg-white px-3 text-sm" /></form>
      <TableShell>
        <thead className="border-b border-border bg-mint-soft"><tr><th className={th}>Patient</th><th className={th}>Contact</th><th className={th}>City</th><th className={th}>Requests</th><th className={th}>Joined</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((u) => (
            <tr key={u.id}>
              <td className={`${td} font-semibold`}>{u.name}</td><td className={td}>{u.phone ?? u.email}</td><td className={td}>{u.city ?? "—"}</td>
              <td className={`${td} tabular`}>{u._count.requests}</td><td className={`${td} text-muted`}>{formatDate(u.createdAt)}</td>
              <td className={td}>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
              <td className={`${td} space-y-1.5 text-right`}><ResetPasswordButton userId={u.id} label={u.name} /><form action={async () => { "use server"; await setPatientActiveAction(u.id, !u.isActive); }}><Button variant="outline" size="sm">{u.isActive ? "Disable" : "Enable"}</Button></form></td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <Pager page={data.page} pageCount={data.pageCount} hrefFor={(p) => `/admin/patients?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
    </>
  );
}
