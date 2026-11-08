"use client";
import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPasswordAction } from "@/app/admin/(panel)/actions";

/** Issues a temporary password (shown once) for a patient / lab owner who forgot theirs. */
export function ResetPasswordButton({ userId, label }: { userId: string; label: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ temp?: string; error?: string } | null>(null);
  if (result?.temp) {
    return (
      <div role="status" className="rounded-lg bg-amber-50 p-2 text-left text-xs text-[#7a4900]">
        Temporary password for {label}: <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-sm font-bold">{result.temp}</code>
        <span className="mt-1 block">Shown once. Share it securely; they should change it after signing in.</span>
        <button type="button" onClick={() => setResult(null)} className="mt-1 cursor-pointer underline">Hide</button>
      </div>
    );
  }
  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => { if (window.confirm(`Reset the password for ${label}? Their current password stops working.`)) start(async () => setResult(await resetPasswordAction(userId))); }}>
        <KeyRound className="size-4" /> {pending ? "…" : "Reset password"}
      </Button>
      {result?.error ? <p role="alert" className="mt-1 text-xs text-danger">{result.error}</p> : null}
    </>
  );
}
