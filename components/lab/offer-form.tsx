"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { sendOfferAction } from "@/app/lab/actions";

export function OfferForm({ requestId, existing, homeDefault }: {
  requestId: string;
  existing: { totalPrice: number; homeCollectionAvailable: boolean; reportTimeHours: number | null; note: string | null } | null;
  homeDefault: boolean;
}) {
  return (
    <ActionForm action={sendOfferAction.bind(null, requestId)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your total price (₹)" htmlFor="totalPrice" hint="For all tests in this request, all charges included">
          <Input id="totalPrice" name="totalPrice" type="number" min="1" step="0.01" inputMode="decimal" required defaultValue={existing?.totalPrice ?? ""} />
        </Field>
        <Field label="Reports ready within (hours)" htmlFor="reportTimeHours">
          <Input id="reportTimeHours" name="reportTimeHours" type="number" min="1" defaultValue={existing?.reportTimeHours ?? ""} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="homeCollectionAvailable" defaultChecked={existing?.homeCollectionAvailable ?? homeDefault} /> I can collect the sample at home</label>
      <Field label="Message to the patient (optional)" htmlFor="note"><Textarea id="note" name="note" className="min-h-20" maxLength={500} defaultValue={existing?.note ?? ""} placeholder="e.g. Free home collection, reports on WhatsApp" /></Field>
      <SubmitButton size="lg" pendingText="Sending…">{existing ? "Update offer" : "Send offer"}</SubmitButton>
    </ActionForm>
  );
}
