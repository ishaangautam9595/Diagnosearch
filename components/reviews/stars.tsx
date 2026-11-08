import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star row. `value` may be fractional (rounded to the nearest half for the fill). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={cn("size-4", value >= i - 0.25 ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
      ))}
    </span>
  );
}

/** Compact "★ 4.6 (23)" used on cards. */
export function RatingBadge({ average, count }: { average: number | null; count: number }) {
  if (!count || average == null) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" aria-label={`Rated ${average} out of 5 from ${count} review${count === 1 ? "" : "s"}`}>
      <Star aria-hidden className="size-3.5 fill-amber-400 text-amber-400" /> {average.toFixed(1)} <span className="font-normal text-muted">({count})</span>
    </span>
  );
}
