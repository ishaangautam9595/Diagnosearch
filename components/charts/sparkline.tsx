"use client";
import { motion } from "framer-motion";

/** Tiny trend line for stat tiles. Decorative — the tile's number and delta carry the meaning. */
export function Sparkline({ values, color = "var(--s1)", width = 96, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="viz overflow-visible">
      <path d={`${d} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill={color} opacity={0.1} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} stroke="var(--viz-surface)" strokeWidth={2} />
    </svg>
  );
}
