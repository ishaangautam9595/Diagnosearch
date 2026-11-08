"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { niceMax, useWidth } from "./use-size";
import { cn } from "@/lib/utils";

/** Column chart: one colour, 4px rounded data-ends on the baseline, per-bar hover tooltip (the bar is the hit target). */
export function ColumnChart({ data, color = "var(--s1)", height = 220, yFormat = (n) => String(n), ariaLabel, valueLabel = "Value" }: {
  data: { label: string; value: number; sub?: string }[]; color?: string; height?: number; yFormat?: (n: number) => string; ariaLabel: string; valueLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const M = { l: 40, r: 8, t: 14, b: 26 };
  const iw = width - M.l - M.r, ih = height - M.t - M.b;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const slot = iw / Math.max(1, data.length);
  const bw = Math.min(40, Math.max(6, slot * 0.58));
  const showValues = data.length <= 8;
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 56)));
  return (
    <div className="viz relative min-w-0" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={width - M.r} y1={M.t + ih - t * ih} y2={M.t + ih - t * ih} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} />
            <text x={M.l - 8} y={M.t + ih - t * ih + 4} textAnchor="end" fontSize={11} fill="var(--viz-ink-3)" className="tabular">{yFormat(t * max)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * ih);
          const bx = M.l + slot * i + (slot - bw) / 2, by = M.t + ih - h;
          return (
            <g key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} role="img" aria-label={`${d.label}: ${yFormat(d.value)}`} className="outline-none">
              <rect x={M.l + slot * i} y={M.t} width={slot} height={ih} fill="transparent" />
              <motion.path d={`M${bx},${M.t + ih} V${by + 4} Q${bx},${by} ${bx + 4},${by} H${bx + bw - 4} Q${bx + bw},${by} ${bx + bw},${by + 4} V${M.t + ih} Z`}
                fill={color} opacity={hover === null || hover === i ? 1 : 0.55} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: `${bx}px ${M.t + ih}px` }} transition={{ duration: 0.55, delay: i * 0.04, ease: "easeOut" }} />
              {showValues && d.value > 0 ? <text x={bx + bw / 2} y={by - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--viz-ink-2)" className="tabular">{yFormat(d.value)}</text> : null}
              {i % every === 0 ? <text x={bx + bw / 2} y={height - 7} textAnchor="middle" fontSize={11} fill="var(--viz-ink-3)">{d.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {hover !== null ? (
        <div role="status" className="pointer-events-none absolute z-10 rounded-xl border border-[var(--viz-grid)] bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(width - 130, Math.max(0, M.l + slot * hover + slot / 2 - 55)), top: 0 }}>
          <p className="font-semibold text-[var(--viz-ink-2)]">{data[hover].label}</p>
          <p className="tabular text-sm font-bold text-[var(--viz-ink)]">{yFormat(data[hover].value)} <span className="text-xs font-normal text-[var(--viz-ink-3)]">{valueLabel}</span></p>
          {data[hover].sub ? <p className="text-[var(--viz-ink-3)]">{data[hover].sub}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal bars with a direct value label on each — for ranking a handful of items (e.g. offers by price). */
export function HBarChart({ rows, format = (n) => String(n), color = "var(--s1)", ariaLabel }: {
  rows: { label: string; value: number; sub?: string; highlight?: boolean }[]; format?: (n: number) => string; color?: string; ariaLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="viz space-y-3" aria-label={ariaLabel}>
      {rows.map((r, i) => (
        <li key={r.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate font-medium text-[var(--viz-ink)]">{r.label}{r.highlight ? <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-primary-dark">Lowest</span> : null}</span>
            <span className="tabular shrink-0 font-bold text-[var(--viz-ink)]">{format(r.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--viz-grid)]">
            <motion.div className="h-full rounded-full" style={{ background: color, opacity: r.highlight ? 1 : 0.62 }} initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }} />
          </div>
          {r.sub ? <p className="mt-0.5 text-xs text-[var(--viz-ink-3)]">{r.sub}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/** Ordered stages (funnel) — one-hue ordinal ramp, light → dark, with the step-to-step conversion between them. */
export function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const ramp = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"];
  const max = Math.max(1, stages[0]?.value ?? 1);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ol className="viz space-y-1" aria-label="Funnel">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            {conv !== null ? <p className="py-0.5 pl-1 text-[11px] font-medium text-[var(--viz-ink-3)]">↓ {conv}% continue</p> : null}
            <div onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className={cn("relative h-11 rounded-lg bg-[var(--viz-grid)]/60 transition-opacity", hover !== null && hover !== i && "opacity-60")}>
              <motion.div className="flex h-full items-center rounded-lg px-3" style={{ background: ramp[Math.min(i, ramp.length - 1)], minWidth: s.value > 0 ? 44 : 0 }} initial={{ width: 0 }} animate={{ width: `${Math.max(s.value > 0 ? 8 : 0, (s.value / max) * 100)}%` }} transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}>
                <span className="tabular text-sm font-bold text-white">{s.value.toLocaleString("en-IN")}</span>
              </motion.div>
              <span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-[var(--viz-ink-2)]">{s.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One whole split into a few parts: a segmented bar with 2px gaps and a legend carrying the numbers. */
export function SegmentedBar({ parts, ariaLabel }: { parts: { label: string; value: number; color: string }[]; ariaLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="viz">
      <div role="img" aria-label={ariaLabel} className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-[var(--viz-grid)]">
        {total === 0 ? null : parts.filter((p) => p.value > 0).map((p, i) => (
          <motion.div key={p.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: p.color, opacity: hover === null || hover === i ? 1 : 0.5 }} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
            onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-[var(--viz-ink-2)]"><span className="size-2.5 rounded-sm" style={{ background: p.color }} />{p.label}</span>
            <span className="tabular font-bold text-[var(--viz-ink)]">{p.value}<span className="ml-1 text-xs font-normal text-[var(--viz-ink-3)]">{total ? `${Math.round((p.value / total) * 100)}%` : ""}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
