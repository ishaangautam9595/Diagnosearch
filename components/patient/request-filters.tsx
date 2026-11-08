"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDebounced } from "@/lib/client/use-debounced";
import { cn } from "@/lib/utils";

const CHIPS = [
  { key: "all", label: "All" }, { key: "open", label: "Open" }, { key: "offers", label: "Has offers" },
  { key: "accepted", label: "Accepted" }, { key: "completed", label: "Completed" }, { key: "cancelled", label: "Cancelled" },
] as const;

/** Search box, status chips and sort. Everything lives in the URL (?q=&status=&sort=&page=) so results are shareable and survive refresh. */
export function RequestFilters({ q, filter, sort, counts }: { q: string; filter: string; sort: string; counts: Record<string, number> }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const debounced = useDebounced(text, 300);
  const first = useRef(true);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (debounced.trim() !== q) go({ q: debounced.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search requests</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by reference, test or lab name…"
            className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm focus-visible:outline-2 focus-visible:outline-primary-dark" />
          {text ? <button type="button" aria-label="Clear search" onClick={() => { setText(""); go({ q: null }); }} className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint"><X className="size-4" /></button> : null}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select value={sort} onChange={(e) => go({ sort: e.target.value === "newest" ? null : e.target.value })}
            className="h-11 cursor-pointer rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary-dark">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="offers">Most offers</option>
          </select>
        </label>
      </div>
      <div role="group" aria-label="Filter by status" className="flex gap-2 overflow-x-auto pb-1">
        {CHIPS.map((c) => {
          const active = filter === c.key;
          return (
            <button key={c.key} type="button" aria-pressed={active} onClick={() => go({ status: c.key === "all" ? null : c.key })}
              className={cn("flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "border-primary-dark bg-primary-dark text-white" : "border-border bg-white hover:bg-mint")}>
              {c.label}
              <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-slate-100 text-muted")}>{counts[c.key] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
