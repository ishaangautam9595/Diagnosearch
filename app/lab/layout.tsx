import { Suspense } from "react";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/card";
import { requireLabPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { labSignOutAction } from "./actions";

export const metadata: Metadata = { title: { default: "Lab dashboard", template: "%s · DiagnoSearch Lab" }, robots: { index: false } };

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await requireLabPage();
  const lab = me.laboratoryId ? await db.laboratory.findUnique({ where: { id: me.laboratoryId }, select: { name: true, approvalStatus: true, isActive: true, rejectionReason: true } }) : null;
  const live = lab?.approvalStatus === "APPROVED" && lab.isActive;
  const newCount = live && me.laboratoryId
    ? await db.requestRecipient.count({ where: { laboratoryId: me.laboratoryId, request: { status: "OPEN", offers: { none: { laboratoryId: me.laboratoryId } } } } })
    : 0;
  return (
    <DashboardShell
      variant="lab"
      user={{ name: lab?.name ?? me.name, sub: me.email ?? me.phone ?? "" }}
      signOut={labSignOutAction}
      nav={[
        { href: "/lab", label: "Overview", icon: "dashboard", exact: true },
        { href: "/lab/requests", label: "Requests", icon: "inbox", badge: newCount || undefined },
        { href: "/lab/won", label: "Won bookings", icon: "won" },
        { href: "/lab/profile", label: "Lab profile", icon: "profile" },
      ]}
    >
      {!live ? (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-[#7a4900]">
          <Clock className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{lab?.approvalStatus === "REJECTED" ? "Your application wasn't approved" : "Your application is under review"}</p>
            <p>{lab?.approvalStatus === "REJECTED" ? `Reason: ${lab.rejectionReason ?? "not provided"}. Please contact support.` : "You'll start receiving patient requests from within 20 km as soon as our team approves your laboratory."}</p>
          </div>
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
