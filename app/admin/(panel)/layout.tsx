import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav";
import { Skeleton } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { countPendingApplications } from "@/lib/services/partner";
import { logoutAction } from "../actions";

async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const pending = admin.role === "ADMIN" ? await countPendingApplications() : 0;
  const nav: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/requests", label: "Requests", icon: "requests" },
    ...(admin.role === "ADMIN"
      ? ([
          { href: "/admin/patients", label: "Patients", icon: "patients" },
          { href: "/admin/laboratories", label: "Laboratories", icon: "labs" },
          { href: "/admin/partners", label: "Applications", icon: "applications", badge: pending || undefined },
          { href: "/admin/tests", label: "Tests", icon: "tests" },
          { href: "/admin/categories", label: "Categories", icon: "categories" },
          { href: "/admin/settings", label: "Settings", icon: "settings" },
        ] satisfies NavItem[])
      : []),
  ];
  return (
    <DashboardShell variant="admin" nav={nav} user={{ name: admin.name, sub: `${admin.email} · ${admin.role}` }} signOut={logoutAction}>
      {children}
    </DashboardShell>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
