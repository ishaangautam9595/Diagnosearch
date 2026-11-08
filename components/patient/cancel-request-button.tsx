"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelRequestAction } from "@/app/app/actions";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!confirm) return <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>Cancel request</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Delete this request and all its offers &amp; chats?</span>
      <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => { const r = await cancelRequestAction(requestId); if (r.ok) router.push("/app/requests"); else setError(r.error ?? "Failed"); })}>{pending ? "…" : "Yes, cancel"}</Button>
      <Button variant="outline" size="sm" onClick={() => setConfirm(false)}>Keep</Button>
      {error ? <span role="alert" className="text-danger">{error}</span> : null}
    </div>
  );
}
