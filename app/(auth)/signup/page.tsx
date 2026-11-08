import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/site/auth-form";
import { getSession, roleHome } from "@/lib/auth";
import { getDefaultMapCenter } from "@/lib/services/map-defaults";

export const metadata: Metadata = { title: "Create your account" };

async function Gate() {
  const s = await getSession();
  if (s) redirect(roleHome(s.role));
  return <AuthForm mode="signup" center={await getDefaultMapCenter()} />;
}

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mb-6 mt-1 text-muted">Tell us where you are. Then upload a prescription or list the tests you need — nearby labs will send you their best prices.</p>
      <Card className="p-5 sm:p-6"><Suspense fallback={<div className="h-96" />}><Gate /></Suspense></Card>
      <p className="mt-4 text-center text-sm text-muted">Run a laboratory? <a className="font-semibold text-primary-dark underline" href="/partner">Become a lab partner</a></p>
    </div>
  );
}
