import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/card";
import { requirePatientPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { patientSignOutAction } from "./actions";

export const metadata: Metadata = { title: { default: "My dashboard", template: "%s · DiagnoSearch" }, robots: { index: false } };

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await requirePatientPage();
  const [withOffers, wallet] = await Promise.all([
    db.testRequest.count({ where: { patientId: me.id, status: "OPEN", offers: { some: {} } } }),
    db.user.findUnique({ where: { id: me.id }, select: { loyaltyCoins: true } }),
  ]);
  return (
    <DashboardShell
      variant="patient"
      user={{ name: me.name, sub: me.email ?? me.phone ?? "" }}
      signOut={patientSignOutAction}
      coins={wallet?.loyaltyCoins ?? 0}
      nav={[
        { href: "/app", label: "Overview", icon: "dashboard", exact: true },
        { href: "/app/requests/new", label: "New request", icon: "new", exact: true },
        { href: "/app/requests", label: "My requests", icon: "requests", badge: withOffers || undefined },
        { href: "/app/profile", label: "Profile", icon: "profile" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
