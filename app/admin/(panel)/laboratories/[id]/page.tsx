import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getLabForAdmin } from "@/lib/services/admin-portal";
import { getDefaultMapCenter } from "@/lib/services/map-defaults";
import { LabForm } from "@/components/admin/lab-form";
import { PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit laboratory" };

export default async function EditLabPage({ params, searchParams }: PageProps<"/admin/laboratories/[id]">) {
  await requireAdminPage(["ADMIN"]);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lab = await getLabForAdmin(id);
  if (!lab) notFound();
  return (
    <>
      <PageHeading title={lab.name} />
      {sp.saved ? <p role="status" className="mb-4 rounded-xl bg-mint p-3 text-sm font-medium text-primary-dark">Laboratory saved.</p> : null}
      <LabForm id={lab.id} lab={lab} center={await getDefaultMapCenter()} />
    </>
  );
}
