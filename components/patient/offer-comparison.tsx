"use client";
import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";
import { HBarChart } from "@/components/charts/bars";
import { formatINR } from "@/lib/money";

export function OfferComparison({ offers }: { offers: { lab: string; price: number }[] }) {
  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const lo = sorted[0].price, hi = sorted[sorted.length - 1].price;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="viz mb-5 rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><TrendingDown className="size-4 text-primary-dark" /> Price comparison</h2>
        {hi > lo ? <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-primary-dark">Save up to {formatINR(hi - lo)} ({Math.round(((hi - lo) / hi) * 100)}%)</span> : null}
      </div>
      <HBarChart ariaLabel="Offer prices compared" format={formatINR} rows={sorted.map((o) => ({ label: o.lab, value: o.price, highlight: o.price === lo }))} />
    </motion.div>
  );
}
