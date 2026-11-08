import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { TestForm } from "@/components/admin/test-form";
import { PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit test" };

export default async function EditTestPage({ params }: PageProps<"/admin/tests/[id]">) {
  await requireAdminPage(["ADMIN"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [test, categories] = await Promise.all([
    db.diagnosticTest.findUnique({ where: { id } }),
    db.testCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!test) notFound();
  return (<><PageHeading title={test.name} /><TestForm id={test.id} test={test} categories={categories} /></>);
}
