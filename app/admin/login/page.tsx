import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/header";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { getSession } from "@/lib/auth";
import { loginAction } from "../actions";

async function Form() {
  const s = await getSession();
  if (s && (s.role === "ADMIN" || s.role === "STAFF")) redirect("/admin/dashboard");
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </ActionForm>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card className="p-6">
          <h1 className="mb-1 text-xl font-bold">Admin sign in</h1>
          <p className="mb-5 text-sm text-muted">Authorised team members only.</p>
          <Suspense fallback={<div className="h-48" />}><Form /></Suspense>
        </Card>
      </div>
    </div>
  );
}
