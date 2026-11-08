"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/generated/prisma/client";

/** Sent → Offers → Accepted, with an animated progress rail. */
export function RequestJourney({ status, offers, compact = false }: { status: RequestStatus; offers: number; compact?: boolean }) {
  if (status === "CANCELLED") return <p className="text-xs font-medium text-danger">Cancelled</p>;
  const stage = status === "ACCEPTED" || status === "COMPLETED" ? 3 : offers > 0 ? 2 : 1;
  const steps = [{ label: "Sent" }, { label: offers > 0 ? `${offers} offer${offers === 1 ? "" : "s"}` : "Offers" }, { label: status === "COMPLETED" ? "Completed" : "Accepted" }];
  return (
    <ol className={cn("relative flex items-center justify-between", compact ? "gap-2" : "gap-3")} aria-label="Progress">
      <span aria-hidden className="absolute left-3 right-3 top-3 h-0.5 -translate-y-1/2 rounded-full bg-border" />
      <motion.span aria-hidden className="absolute left-3 top-3 h-0.5 -translate-y-1/2 rounded-full bg-primary-dark" initial={{ width: 0 }} animate={{ width: `calc(${((stage - 1) / 2) * 100}% - ${(stage - 1) * 0}px)` }} style={{ maxWidth: "calc(100% - 1.5rem)" }} transition={{ duration: 0.8, ease: "easeOut" }} />
      {steps.map((s, i) => {
        const done = i + 1 < stage || stage === 3, current = i + 1 === stage && stage !== 3;
        return (
          <li key={s.label} className="relative z-10 flex flex-col items-center gap-1">
            <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * i, type: "spring", stiffness: 380, damping: 20 }}
              className={cn("grid size-6 place-items-center rounded-full border-2 text-[10px] font-bold", done ? "border-primary-dark bg-primary-dark text-white" : current ? "border-primary-dark bg-white text-primary-dark" : "border-border bg-white text-muted")}>
              {done ? <Check className="size-3.5" /> : i + 1}
              {current ? <span className="ds-ring absolute inset-0 rounded-full bg-primary/40" aria-hidden /> : null}
            </motion.span>
            {!compact ? <span className={cn("text-[11px] font-medium", done || current ? "text-foreground" : "text-muted")}>{s.label}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
