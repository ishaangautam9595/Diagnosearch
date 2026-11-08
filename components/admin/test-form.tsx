import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { saveTestAction } from "@/app/admin/(panel)/actions";

type T = {
  name: string; categoryId: string; description: string | null; sampleType: string | null; preparationInstructions: string | null;
  preparationVerifiedAt: Date | null; fastingRequirement: string; fastingHours: number | null; turnaroundHours: number | null;
  turnaroundNote: string | null; isPackage: boolean; isActive: boolean;
};

export function TestForm({ id, test, categories }: { id: string | null; test?: T | null; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveTestAction.bind(null, id)} className="space-y-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Test name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" required defaultValue={test?.name} /></Field>
        <Field label="Category" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" required defaultValue={test?.categoryId ?? ""}>
            <option value="" disabled>Select…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Sample type" htmlFor="sampleType"><Input id="sampleType" name="sampleType" defaultValue={test?.sampleType ?? ""} placeholder="e.g. Serum" /></Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" defaultValue={test?.description ?? ""} /></Field>
        <Field label="Typical report time (hours)" htmlFor="turnaroundHours"><Input id="turnaroundHours" name="turnaroundHours" type="number" min="0" defaultValue={test?.turnaroundHours ?? ""} /></Field>
        <Field label="Report time note" htmlFor="turnaroundNote"><Input id="turnaroundNote" name="turnaroundNote" defaultValue={test?.turnaroundNote ?? ""} /></Field>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-semibold">Preparation &amp; fasting</h2>
          <p className="mt-1 text-sm text-muted">Clinical instructions are never generated automatically. Enter text only from a reliable source, and tick “verified” once a qualified person has checked it. Unverified text is not shown to patients.</p>
        </div>
        <Field label="Fasting requirement" htmlFor="fastingRequirement">
          <Select id="fastingRequirement" name="fastingRequirement" defaultValue={test?.fastingRequirement ?? "UNKNOWN"}>
            <option value="UNKNOWN">Unknown / confirm with lab</option><option value="REQUIRED">Fasting required</option><option value="NOT_REQUIRED">No fasting required</option>
          </Select>
        </Field>
        <Field label="Fasting hours (if required)" htmlFor="fastingHours"><Input id="fastingHours" name="fastingHours" type="number" min="0" defaultValue={test?.fastingHours ?? ""} /></Field>
        <Field label="Preparation instructions" htmlFor="preparationInstructions" className="sm:col-span-2"><Textarea id="preparationInstructions" name="preparationInstructions" defaultValue={test?.preparationInstructions ?? ""} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox name="preparationVerified" defaultChecked={!!test?.preparationVerifiedAt} /> Preparation &amp; fasting information verified</label>
      </Card>
      <Card className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm"><Checkbox name="isPackage" defaultChecked={test?.isPackage} /> This is a package / checkup</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked={test ? test.isActive : true} /> Active</label>
      </Card>
      <SubmitButton size="lg">{id ? "Save changes" : "Create test"}</SubmitButton>
    </ActionForm>
  );
}
