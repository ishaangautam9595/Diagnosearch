"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApiState } from "@/lib/client/use-api";

const ago = (d: Date, now: number) => {
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  return s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};

/** "Updated 12s ago · Refresh" + an inline banner when the latest refresh failed (old data stays visible). */
export function ApiStatus({ api, className }: { api: Pick<ApiState<unknown>, "updatedAt" | "refreshing" | "error" | "reload">; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs text-muted", className)}>
      {api.updatedAt ? <span aria-live="polite" data-testid="updated-at">Updated {ago(api.updatedAt, now)}</span> : null}
      <button type="button" onClick={api.reload} disabled={api.refreshing} className="flex cursor-pointer items-center gap-1 font-medium text-primary-dark hover:underline disabled:opacity-60">
        <RefreshCw className={cn("size-3.5", api.refreshing && "animate-spin")} /> Refresh
      </button>
      {api.error ? <span role="alert" className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-[#8a5300]"><AlertTriangle className="size-3.5" /> {api.error} Showing the last data we have.</span> : null}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your data">
      <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 size-7 text-[#8a5300]" />
      <p className="font-semibold text-[#7a4900]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary-dark px-4 text-sm font-semibold text-white hover:brightness-90"><RefreshCw className="size-4" /> Try again</button>
    </div>
  );
}
