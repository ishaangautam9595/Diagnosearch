import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/site/auth-form";
import { getSession, roleHome } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

async function Gate() {
  const s = await getSession();
  if (s) redirect(roleHome(s.role));
  return <AuthForm mode="login" center={{ lat: 22.5, lng: 79, zoom: 4 }} />;
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-1 text-muted">Patients and lab partners sign in with a mobile number or email and a password.</p>
      <Card className="p-6"><Suspense fallback={<div className="h-56" />}><Gate /></Suspense></Card>
    </div>
  );
}
