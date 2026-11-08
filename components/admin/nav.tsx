"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, Building2, FlaskConical, Layers, LayoutDashboard, MapPin, Settings, Tags, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList, adminOnly: false },
  { href: "/admin/laboratories", label: "Laboratories", icon: Building2, adminOnly: true },
  { href: "/admin/partners", label: "Applications", icon: Handshake, adminOnly: true },
  { href: "/admin/pricing", label: "Pricing", icon: Tags, adminOnly: true },
  { href: "/admin/tests", label: "Tests", icon: FlaskConical, adminOnly: true },
  { href: "/admin/categories", label: "Categories", icon: Layers, adminOnly: true },
  { href: "/admin/localities", label: "Localities", icon: MapPin, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminNav({ role, pendingApplications = 0 }: { role: "ADMIN" | "STAFF"; pendingApplications?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.filter((i) => !i.adminOnly || role === "ADMIN").map((i) => {
        const active = path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-mint text-primary-dark" : "text-foreground hover:bg-mint-soft")}>
            <i.icon className="size-4" /> {i.label}
            {i.href === "/admin/partners" && pendingApplications > 0 ? <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs font-bold text-[#7a4900]" aria-label={`${pendingApplications} pending`}>{pendingApplications}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
