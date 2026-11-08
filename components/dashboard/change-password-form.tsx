"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { changeOwnPasswordAction } from "@/app/account-actions";

export function ChangePasswordCard() {
  return (
    <Card className="max-w-2xl">
      <h2 className="mb-1 font-semibold">Change password</h2>
      <p className="mb-4 text-sm text-muted">At least 8 characters, with letters and a number.</p>
      <ActionForm action={changeOwnPasswordAction} resetOnSuccess className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="cp-current"><Input id="cp-current" name="current" type="password" autoComplete="current-password" required /></Field>
        <Field label="New password" htmlFor="cp-next"><Input id="cp-next" name="next" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Field>
        <Field label="Confirm new password" htmlFor="cp-confirm"><Input id="cp-confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
        <div className="sm:col-span-3"><SubmitButton>Change password</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}
