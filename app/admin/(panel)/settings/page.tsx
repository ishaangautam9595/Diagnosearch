import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ChangePasswordCard } from "@/components/dashboard/change-password-form";
import { PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdminPage(["ADMIN"]);
  return (
    <>
      <PageHeading title="Settings" subtitle={`Signed in as ${admin.email}`} />
      <ChangePasswordCard />
    </>
  );
}
