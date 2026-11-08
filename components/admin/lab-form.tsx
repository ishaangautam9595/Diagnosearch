import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { saveLaboratoryAction } from "@/app/admin/(panel)/actions";
import { AddressesEditor, type EditableAddress } from "@/components/map/addresses-editor";

type Lab = {
  name: string; description: string | null; phone: string; whatsapp: string | null; email: string | null; openingHours: string | null; accreditation: string | null;
  homeCollectionAvailable: boolean;
  isActive: boolean; verificationStatus: string;
  addresses: EditableAddress[];
};

export function LabForm({ id, lab, center }: { id: string | null; lab?: Lab | null; center: { lat: number; lng: number; zoom: number } }) {
  return (
    <ActionForm action={saveLaboratoryAction.bind(null, id)} className="space-y-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Basics</h2>
        <Field label="Laboratory name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" required defaultValue={lab?.name} /></Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" defaultValue={lab?.description ?? ""} /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" required defaultValue={lab?.phone} /></Field>
        <Field label="WhatsApp" htmlFor="whatsapp"><Input id="whatsapp" name="whatsapp" defaultValue={lab?.whatsapp ?? ""} /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={lab?.email ?? ""} /></Field>
        <Field label="Opening hours" htmlFor="openingHours"><Input id="openingHours" name="openingHours" defaultValue={lab?.openingHours ?? ""} placeholder="Mon–Sat 7 AM – 7 PM" /></Field>
      </Card>
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Addresses</h2>
          <p className="text-sm text-muted">Type the address and/or pin it on the map. A lab can have several branches; patients are matched to the closest one.</p>
        </div>
        <AddressesEditor initial={lab?.addresses} fallback={center} />
      </section>
      <Card>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="homeCollectionAvailable" defaultChecked={lab?.homeCollectionAvailable} /> Home collection available</label>
      </Card>
      <Card className="grid gap-4">
        <h2 className="font-semibold">Verification &amp; status</h2>
        <Field label="Accreditation details" htmlFor="accreditation" hint="Shown to patients only when the lab is marked verified. Enter only what you have verified."><Textarea id="accreditation" name="accreditation" defaultValue={lab?.accreditation ?? ""} /></Field>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="verified" defaultChecked={lab?.verificationStatus === "VERIFIED"} /> Verified manually by our team</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked={lab ? lab.isActive : true} /> Active (visible to patients)</label>
      </Card>
      <SubmitButton size="lg">{id ? "Save changes" : "Create laboratory"}</SubmitButton>
    </ActionForm>
  );
}
