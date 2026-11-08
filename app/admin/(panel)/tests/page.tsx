import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager, TableShell, td, th } from "@/components/admin/bits";
import { deleteTestAction } from "../actions";

export const metadata: Metadata = { title: "Tests" };
const PAGE = 25;

export default async function AdminTestsPage({ searchParams }: PageProps<"/admin/tests">) {
  await requireAdminPage(["ADMIN"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(parseInt(String(sp.page ?? "1"), 10) || 1, 1);
  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};
  const [total, tests] = await Promise.all([
    db.diagnosticTest.count({ where }),
    db.diagnosticTest.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE, take: PAGE, include: { category: { select: { name: true } }, _count: { select: { requestTests: true } } } }),
  ]);
  return (
    <>
      <PageHeading title="Tests" subtitle={`${total} in catalogue`} actions={<Button asChild><Link href="/admin/tests/new"><Plus className="size-4" /> Add test</Link></Button>} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search tests" aria-label="Search tests" className="h-10 w-full max-w-sm rounded-xl border border-border bg-white px-3 text-sm" /></form>
      <TableShell>
        <thead className="border-b border-border bg-mint-soft"><tr><th className={th}>Test</th><th className={th}>Category</th><th className={th}>Prep verified</th><th className={th}>Requested</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-border">
          {tests.map((t) => (
            <tr key={t.id}>
              <td className={td}><Link href={`/admin/tests/${t.id}`} className="font-semibold hover:underline">{t.name}</Link>{t.isPackage ? <Badge tone="blue" className="ml-2">Package</Badge> : null}{t.isDemo ? <Badge tone="amber" className="ml-1">DEMO</Badge> : null}</td>
              <td className={td}>{t.category.name}</td>
              <td className={td}>{t.preparationVerifiedAt ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>}</td>
              <td className={`${td} tabular`}>{t._count.requestTests}</td>
              <td className={td}>{t.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</td>
              <td className={`${td} text-right`}>
                <form action={async () => { "use server"; await deleteTestAction(t.id); }}><Button variant="outline" size="sm">Delete</Button></form>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <Pager page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => `/admin/tests?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
      <p className="mt-3 text-xs text-muted">Tests that appear in existing bookings are deactivated instead of deleted.</p>
    </>
  );
}
