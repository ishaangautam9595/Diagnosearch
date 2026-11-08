"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FilePlus2, FlaskConical, Handshake, Inbox, Layers, LayoutDashboard, Send, Settings, Trophy, UserRound, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, requests: ClipboardList, new: FilePlus2, profile: UserRound, inbox: Inbox, offers: Send, won: Trophy,
  labs: Building2, applications: Handshake, patients: Users, tests: FlaskConical, categories: Layers, settings: Settings,
};

export interface NavItem { href: string; label: string; icon: keyof typeof ICONS; badge?: number; exact?: boolean }

export function DashboardNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-mint text-primary-dark" : "text-foreground hover:bg-mint-soft")}>
            <Icon className="size-4" /> {i.label}
            {i.badge ? <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs font-bold text-[#7a4900]" aria-label={`${i.badge} new`}>{i.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
