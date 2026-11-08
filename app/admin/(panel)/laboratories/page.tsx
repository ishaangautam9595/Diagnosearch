import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listLabsForAdmin } from "@/lib/services/admin-portal";
import { Badge, PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableShell, td, th } from "@/components/admin/bits";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { toggleLaboratoryAction } from "../actions";

export const metadata: Metadata = { title: "Laboratories" };

export default async function LabsPage() {
  await requireAdminPage(["ADMIN"]);
  const labs = await listLabsForAdmin();
  return (
    <>
      <PageHeading title="Laboratories" actions={<Button asChild><Link href="/admin/laboratories/new"><Plus className="size-4" /> Add laboratory</Link></Button>} />
      <TableShell>
        <thead className="border-b border-border bg-mint-soft"><tr><th className={th}>Laboratory</th><th className={th}>City</th><th className={th}>Verification</th><th className={th}>Requests / offers</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-border">
          {labs.map((l) => (
            <tr key={l.id}>
              <td className={td}><Link href={`/admin/laboratories/${l.id}`} className="font-semibold hover:underline">{l.name}</Link>{l.isDemo ? <Badge tone="amber" className="ml-2">DEMO</Badge> : null}</td>
              <td className={td}>{l.addresses[0]?.city ?? "—"}</td>
              <td className={td}>{l.verificationStatus === "VERIFIED" ? <Badge tone="green">Verified</Badge> : <Badge>Unverified</Badge>}</td>
              <td className={`${td} tabular`}>{l._count.recipients} / {l._count.offers}</td>
              <td className={td}>{l.approvalStatus === "PENDING" ? <Badge tone="amber">Pending approval</Badge> : l.approvalStatus === "REJECTED" ? <Badge tone="red">Rejected</Badge> : l.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</td>
              <td className={`${td} space-y-1.5 text-right`}>
                {l.owners[0] ? <ResetPasswordButton userId={l.owners[0].id} label={`${l.name} owner`} /> : null}
                <form action={async () => { "use server"; await toggleLaboratoryAction(l.id, !l.isActive); }}>
                  <Button variant="outline" size="sm">{l.isActive ? "Deactivate" : "Activate"}</Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </>
  );
}
