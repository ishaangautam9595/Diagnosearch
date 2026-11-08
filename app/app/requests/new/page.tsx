import Link from "next/link";
import type { Metadata } from "next";
import { MapPinOff } from "lucide-react";
import { requirePatientPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { findLabsInRadius, REQUEST_RADIUS_KM } from "@/lib/services/requests";
import { RequestForm } from "@/components/patient/request-form";
import { EmptyState } from "@/components/dashboard/bits";
import { PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage() {
  const me = await requirePatientPage();
  if (me.latitude == null || me.longitude == null) {
    return <EmptyState icon={<MapPinOff className="size-6" />} title="Add your address first" text="We need a pinned address to find labs within 20 km of you." action={<Button asChild><Link href="/app/profile">Add address</Link></Button>} />;
  }
  const labs = await findLabsInRadius(db, me.latitude, me.longitude);
  return (
    <>
      <PageHeading title="New request" subtitle="Upload your prescription and/or list your tests. Nearby labs will reply with their best price." />
      <RequestForm address={`${me.addressLine}, ${me.city} ${me.pincode}`} labsNearby={labs.length} radiusKm={REQUEST_RADIUS_KM} />
    </>
  );
}
