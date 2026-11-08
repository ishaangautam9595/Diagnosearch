"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReviewAction } from "@/app/app/actions";
import { cn } from "@/lib/utils";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** Star picker + optional feedback. Shown to the patient once the lab has marked the booking completed. */
export function ReviewForm({ requestId, labName }: { requestId: string; labName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await submitReviewAction(requestId, { rating, comment });
      if (r.ok) router.refresh(); else setError(r.error ?? "Couldn't save your review.");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <p className="font-semibold">How was your experience with {labName}?</p>
        <p className="text-xs text-muted">Your rating and feedback will be visible to everyone viewing this lab. Only your first name is shown.</p>
      </div>
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded p-0.5 focus-visible:outline-2 focus-visible:outline-primary-dark">
            <Star className={cn("size-8 transition-colors", shown >= n ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
        {shown ? <span className="ml-2 text-sm font-medium text-muted">{LABELS[shown - 1]}</span> : null}
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Feedback <span className="font-normal text-muted">(optional)</span></span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3}
          placeholder="Sample collection, hygiene, report accuracy, staff behaviour…"
          className="w-full rounded-xl border border-border bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary-dark" />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending || rating === 0}>{pending ? "Submitting…" : "Submit review"}</Button>
    </form>
  );
}
