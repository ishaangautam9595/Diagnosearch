"use client";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

export interface Delta { pct: number | null; /** true when an increase is good news (e.g. revenue). false when a decrease is good (e.g. response time). */ upIsGood?: boolean; label?: string }

/** KPI tile: label · animated value · change vs previous period (icon + text, never colour alone) · sparkline. */
export function StatTile({ label, value, format, text, delta, spark, sparkColor, hint, icon, highlight, index = 0 }: {
  label: string; value?: number; format?: (n: number) => string; text?: string; delta?: Delta; spark?: number[]; sparkColor?: string; hint?: string; icon?: React.ReactNode; highlight?: boolean; index?: number;
}) {
  const d = delta?.pct;
  const good = d == null || d === 0 ? null : (d > 0) === (delta?.upIsGood ?? true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.06 }} whileHover={{ y: -2 }}
      className={cn("viz rounded-2xl border bg-white p-4 shadow-[0_1px_0_rgb(0_0_0/0.02)] transition-shadow hover:shadow-md", highlight ? "border-primary/50 bg-mint" : "border-border")}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--viz-ink-3)]">{icon}{label}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <p className="tabular text-[1.65rem] font-bold leading-tight text-[var(--viz-ink)]">
          {value !== undefined ? <AnimatedNumber value={value} format={format} /> : text}
        </p>
        {spark ? <Sparkline values={spark} color={sparkColor} width={72} height={28} /> : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
        {delta ? (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", good === null ? "text-[var(--viz-ink-3)]" : good ? "text-[var(--good)]" : "text-[var(--bad)]")}>
            {d == null ? <Minus className="size-3.5" /> : d > 0 ? <ArrowUpRight className="size-3.5" /> : d < 0 ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />}
            {d == null ? "New" : `${d > 0 ? "+" : ""}${d}%`}
            <span className="sr-only"> {good === null ? "no change" : good ? "improvement" : "decline"}</span>
          </span>
        ) : null}
        {hint || delta?.label ? <span className="text-[var(--viz-ink-3)]">{delta?.label ?? hint}</span> : null}
      </div>
    </motion.div>
  );
}
