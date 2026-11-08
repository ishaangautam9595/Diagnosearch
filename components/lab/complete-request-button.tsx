"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeRequestAction } from "@/app/lab/actions";

/** "Request completed": closes the booking and credits the patient's loyalty coins. Asks to confirm because it can't be undone. */
export function CompleteRequestButton({ requestId, coins }: { requestId: string; coins: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!confirm) return <Button size="sm" onClick={() => setConfirm(true)}><CheckCheck className="size-4" /> Request completed</Button>;
  return (
    <div role="alertdialog" aria-label="Confirm completing this booking" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-[#7a4900]">
      <p><strong>Mark this booking as completed?</strong> The patient will receive <strong>{coins} loyalty coin{coins === 1 ? "" : "s"}</strong> and can then rate your lab. This can&apos;t be undone.</p>
      {error ? <p role="alert" className="font-medium text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => start(async () => {
          const r = await completeRequestAction(requestId);
          if (r.ok) router.refresh(); else setError(r.error ?? "Couldn't complete this booking.");
        })}>{pending ? "Completing…" : "Yes, completed"}</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>Not yet</Button>
      </div>
    </div>
  );
}
