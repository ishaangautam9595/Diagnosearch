import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { TestForm } from "@/components/admin/test-form";
import { PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Add test" };

export default async function NewTestPage() {
  await requireAdminPage(["ADMIN"]);
  const categories = await db.testCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (<><PageHeading title="Add test" /><TestForm id={null} categories={categories} /></>);
}
