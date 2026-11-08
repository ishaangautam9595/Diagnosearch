import Link from "next/link";
import { Coins, LogOut } from "lucide-react";
import { Logo } from "@/components/site/header";
import { DashboardNav, type NavItem } from "./nav";

export type Variant = "patient" | "lab" | "admin";

/** One accent palette per dashboard so each audience feels like its own space within the same product. */
const THEMES: Record<Variant, { label: string; vars: Record<string, string> }> = {
  patient: { label: "Patient", vars: {} },
  lab: { label: "Lab partner", vars: { "--primary-dark": "#0e6f7e", "--primary": "#1496a8", "--mint": "#e4f5f8", "--mint-soft": "#f2fafb", "--border": "#dbe9ec" } },
  admin: { label: "Admin", vars: { "--primary-dark": "#3b3fa8", "--primary": "#5459d6", "--mint": "#eceefd", "--mint-soft": "#f5f6fe", "--border": "#e2e4f1" } },
};

export function DashboardShell({ variant, nav, user, signOut, coins, children }: {
  variant: Variant;
  nav: NavItem[];
  user: { name: string; sub: string };
  signOut: () => Promise<void>;
  /** Patient loyalty balance, shown as a chip in the header. */
  coins?: number;
  children: React.ReactNode;
}) {
  const theme = THEMES[variant];
  return (
    <div style={theme.vars as React.CSSProperties} className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between lg:block">
            <Logo />
            <div className="flex items-center gap-2 lg:mt-2">
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-primary-dark">{theme.label}</span>
              {coins !== undefined ? (
                <Link href="/app/profile" title="Your loyalty coins" aria-label={`${coins} loyalty coins`} data-testid="coin-chip"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-[#8a5300] hover:bg-amber-100">
                  <Coins className="size-3.5" aria-hidden /> <span className="tabular">{coins}</span>
                </Link>
              ) : null}
            </div>
          </div>
          <DashboardNav items={nav} />
          <div className="hidden rounded-2xl border border-border bg-white p-3 text-sm lg:block">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.sub}</p>
            <form action={signOut}>
              <button className="mt-2 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"><LogOut className="size-4" /> Sign out</button>
            </form>
            <Link href="/" className="mt-2 block text-xs text-muted hover:underline">Home ↗</Link>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
