import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Application received", robots: { index: false } };

export default function PartnerSuccess() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Application received</h1>
      <p className="mt-2 text-muted">Thank you! Our team will review your laboratory and get in touch. You can already sign in with the email or mobile number and password you chose to see your dashboard. You&apos;ll start receiving patient requests once your laboratory is approved.</p>
      <div className="mt-6 flex justify-center gap-3"><Button asChild><Link href="/login">Sign in to your dashboard</Link></Button><Button asChild variant="outline"><Link href="/">Back to home</Link></Button></div>
    </div>
  );
}
