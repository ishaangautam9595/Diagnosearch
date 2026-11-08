import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5", className)} {...props} />;
}

type Tone = "green" | "gray" | "amber" | "red" | "blue";
const tones: Record<Tone, string> = {
  green: "bg-mint text-primary-dark",
  gray: "bg-slate-100 text-slate-700",
  amber: "bg-amber-50 text-[#8a5300]",
  red: "bg-red-50 text-danger",
  blue: "bg-sky-50 text-sky-800",
};
export function Badge({ tone = "gray", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props} />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("ds-shimmer rounded-xl", className)} />;
}

export function PageHeading({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
