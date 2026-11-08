"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { AddressesEditor } from "@/components/map/addresses-editor";
import { submitPartnerAction } from "@/app/(public)/partner/actions";

export function PartnerForm({ center }: {
  center: { lat: number; lng: number; zoom: number };
}) {
  return (
    <ActionForm action={submitPartnerAction} className="space-y-8">
      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">1. About your laboratory</h2>
        <Field label="Laboratory name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" required /></Field>
        <Field label="Contact person" htmlFor="contactPerson"><Input id="contactPerson" name="contactPerson" required autoComplete="name" /></Field>
        <Field label="Email" htmlFor="email" hint="We'll use this to reach you about your application"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" required autoComplete="tel" /></Field>
        <Field label="WhatsApp (optional)" htmlFor="whatsapp"><Input id="whatsapp" name="whatsapp" type="tel" /></Field>
        <Field label="Create a password" htmlFor="password" hint="You'll sign in with your email or phone + this password (min 8 characters, letters and a number)"><Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></Field>
        <Field label="Opening hours" htmlFor="openingHours" className="sm:col-span-2"><Input id="openingHours" name="openingHours" placeholder="Mon–Sat 7 AM – 7 PM, Sun 8 AM – 1 PM" /></Field>
        <Field label="Accreditation / licences (optional)" htmlFor="accreditation" hint="We verify this manually before showing it to patients" className="sm:col-span-2"><Textarea id="accreditation" name="accreditation" className="min-h-16" /></Field>
        <Field label="About the laboratory (optional)" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" className="min-h-20" /></Field>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">2. Addresses</h2>
          <p className="text-sm text-muted">Search your address and pin it on the map, then adjust the details. Have more than one branch? Add each one.</p>
        </div>
        <AddressesEditor fallback={center} />
      </section>

      <Card className="space-y-3">
        <h2 className="font-semibold">3. Collection</h2>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="homeCollectionAvailable" /> We offer home sample collection</label>
        <p className="text-sm text-muted">You don&apos;t need to enter any prices. When a patient near you sends a request, you reply with your best offer for their tests.</p>
      </Card>

      {/* Honeypot — hidden from people, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <label className="flex items-start gap-3 text-sm">
        <Checkbox name="consent" className="mt-0.5" required />
        <span>I&apos;m authorised to register this laboratory and agree that DiagnoSearch may contact me and review the details provided. My laboratory will not appear to patients until it is approved.</span>
      </label>
      <SubmitButton size="lg" pendingText="Submitting…">Submit application</SubmitButton>
    </ActionForm>
  );
}
