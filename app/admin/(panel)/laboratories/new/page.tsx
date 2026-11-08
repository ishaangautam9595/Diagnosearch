import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getDefaultMapCenter } from "@/lib/services/map-defaults";
import { LabForm } from "@/components/admin/lab-form";
import { PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Add laboratory" };

export default async function NewLabPage() {
  await requireAdminPage(["ADMIN"]);
  return (<><PageHeading title="Add laboratory" subtitle="Labs you add start unverified. They receive patient requests within 20 km of any pinned branch." /><LabForm id={null} center={await getDefaultMapCenter()} /></>);
}
