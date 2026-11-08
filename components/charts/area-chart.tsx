"use client";
import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Table2, LineChart } from "lucide-react";
import { niceMax, useWidth } from "./use-size";
import { cn } from "@/lib/utils";

export interface Series { key: string; label: string; color: string; area?: boolean }

/**
 * Multi-series line/area chart: crosshair that snaps to the nearest x, one tooltip listing every series,
 * keyboard (←/→/Esc) support, legend that toggles series, and a table view. One y-axis only.
 */
export function AreaChart({ data, xKey, series, height = 280, xFormat, yFormat = (n) => String(n), ariaLabel, valueSuffix = "" }: {
  data: Record<string, number | string>[]; xKey: string; series: Series[]; height?: number;
  xFormat: (x: string) => string; yFormat?: (n: number) => string; ariaLabel: string; valueSuffix?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const uid = useId();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const visible = series.filter((s) => !hidden.has(s.key));
  const M = { l: 38, r: 12, t: 12, b: 26 };
  const w = Math.max(width, 240), iw = w - M.l - M.r, ih = height - M.t - M.b;
  const n = data.length;
  const yMax = useMemo(() => niceMax(Math.max(1, ...data.flatMap((d) => visible.map((s) => Number(d[s.key]) || 0)))), [data, visible]);
  const x = (i: number) => M.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => M.t + ih - (v / yMax) * ih;
  const path = (key: string) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(d[key]) || 0).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const xTickIdx = n <= 6 ? data.map((_, i) => i) : [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * (n - 1)));
  const totals = (key: string) => data.reduce((a, d) => a + (Number(d[key]) || 0), 0);

  const move = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - M.l;
    setHover(Math.min(n - 1, Math.max(0, Math.round((px / iw) * (n - 1)))));
  };
  const tipLeft = hover === null ? 0 : x(hover);
  const flip = tipLeft > w * 0.6;

  return (
    <div className="viz min-w-0" ref={ref}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {series.map((s) => {
            const off = hidden.has(s.key);
            return (
              <li key={s.key}>
                <button type="button" aria-pressed={!off} onClick={() => setHidden((h) => { const c = new Set(h); if (off) c.delete(s.key); else if (visible.length > 1) c.add(s.key); return c; })}
                  className={cn("flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium transition-opacity hover:bg-slate-50", off && "opacity-40")}>
                  <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />
                  <span className="text-[var(--viz-ink-2)]">{s.label}</span>
                  <span className="tabular font-bold text-[var(--viz-ink)]">{totals(s.key).toLocaleString("en-IN")}{valueSuffix}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--viz-ink-3)] hover:bg-slate-50">
          {table ? <LineChart className="size-3.5" /> : <Table2 className="size-3.5" />} {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[280px] overflow-auto rounded-xl border border-[var(--viz-grid)]">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{ariaLabel}</caption>
            <thead className="sticky top-0 bg-slate-50"><tr><th className="px-3 py-2 font-semibold">Date</th>{series.map((s) => <th key={s.key} className="px-3 py-2 text-right font-semibold">{s.label}</th>)}</tr></thead>
            <tbody>{[...data].reverse().map((d) => <tr key={String(d[xKey])} className="border-t border-[var(--viz-grid)]"><td className="px-3 py-1.5">{xFormat(String(d[xKey]))}</td>{series.map((s) => <td key={s.key} className="tabular px-3 py-1.5 text-right">{Number(d[s.key]) || 0}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0} className="block touch-pan-y overflow-visible outline-offset-2"
            onPointerMove={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())} onPointerLeave={() => setHover(null)}
            onKeyDown={(e) => { if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1)); else if (e.key === "Escape") setHover(null); }}
            onBlur={() => setHover(null)}
          >
            <defs>
              {visible.filter((s) => s.area).map((s) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity={0.22} /><stop offset="100%" stopColor={s.color} stopOpacity={0} /></linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--viz-ink-3)" className="tabular">{yFormat(Math.round(t * 10) / 10)}</text>
              </g>
            ))}
            {xTickIdx.map((i, k) => (
              <text key={i} x={x(i)} y={height - 6} textAnchor={k === 0 ? "start" : k === xTickIdx.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--viz-ink-3)">{xFormat(String(data[i][xKey]))}</text>
            ))}
            {visible.map((s) => (
              <g key={s.key}>
                {s.area ? <path d={`${path(s.key)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${uid}-${s.key})`} /> : null}
                <motion.path key={`${s.key}-${n}`} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 0.4 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
              </g>
            ))}
            {hover !== null ? (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="var(--viz-ink-3)" strokeWidth={1} strokeDasharray="3 3" />
                {visible.map((s) => <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover][s.key]) || 0)} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />)}
              </g>
            ) : null}
          </svg>
          {hover !== null ? (
            <div role="status" className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-[var(--viz-grid)] bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: flip ? undefined : tipLeft + 14, right: flip ? w - tipLeft + 14 : undefined }}>
              <p className="mb-1 font-semibold text-[var(--viz-ink-2)]">{xFormat(String(data[hover][xKey]))}</p>
              {visible.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-[var(--viz-ink-2)]"><span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="tabular text-sm font-bold text-[var(--viz-ink)]">{(Number(data[hover][s.key]) || 0).toLocaleString("en-IN")}{valueSuffix}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
