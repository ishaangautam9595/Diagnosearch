import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, PageHeading } from "@/components/ui/card";
import { Checkbox, Input } from "@/components/ui/form";
import { saveCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdminPage(["ADMIN"]);
  const cats = await db.testCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { tests: true } } } });
  return (
    <>
      <PageHeading title="Categories" />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Add category</h2>
        <ActionForm action={saveCategoryAction.bind(null, null)} resetOnSuccess className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
          <Input name="name" placeholder="Name" aria-label="Name" required />
          <Input name="description" placeholder="Description" aria-label="Description" />
          <Input name="sortOrder" type="number" min="0" defaultValue="0" aria-label="Sort order" />
          <input type="hidden" name="isActive" value="on" />
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-2">
        {cats.map((c) => (
          <Card key={c.id} className="p-3">
            <ActionForm action={saveCategoryAction.bind(null, c.id)} className="grid items-center gap-3 sm:grid-cols-[1fr_1fr_6rem_auto_auto]">
              <Input name="name" defaultValue={c.name} aria-label="Name" required />
              <Input name="description" defaultValue={c.description ?? ""} aria-label="Description" />
              <Input name="sortOrder" type="number" min="0" defaultValue={c.sortOrder} aria-label="Sort order" />
              <label className="flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked={c.isActive} /> Active <span className="text-muted">({c._count.tests})</span></label>
              <SubmitButton variant="outline" size="sm">Save</SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
