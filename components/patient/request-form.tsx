"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, FileText, FlaskConical, ImagePlus, MapPin, Plus, Radar, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/form";
import { RemoteCombobox } from "./combobox";
import { compressImage } from "@/lib/client/compress-image";
import { createRequestAction } from "@/app/app/actions";
import { cn } from "@/lib/utils";

interface Upload { id: string; name: string; bytes: number; originalBytes: number; preview: string }
interface Test { id: string; name: string }
const MAX_TESTS = 10;
const MAX_IMAGES = 4;
const fmtKb = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function RequestForm({ address, labsNearby, radiusKm }: { address: string; labsNearby: number; radiusKm: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(0);
  const [tests, setTests] = useState<Test[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [service, setService] = useState<"ANY" | "HOME_COLLECTION" | "WALK_IN">("ANY");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const count = tests.length + custom.length;

  const addFiles = async (files: FileList | File[]) => {
    setError(null);
    const list = [...files].slice(0, MAX_IMAGES - uploads.length);
    if (list.length === 0) { setError(`You can attach up to ${MAX_IMAGES} images.`); return; }
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        const small = await compressImage(file);
        const fd = new FormData();
        fd.set("file", small);
        const res = await fetch("/api/prescriptions", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        setUploads((u) => [...u, { id: data.id, name: file.name, bytes: data.bytes, originalBytes: file.size, preview: `/api/prescriptions/${data.id}` }]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const removeUpload = (id: string) => {
    setUploads((u) => u.filter((x) => x.id !== id));
    void fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
  };

  const addCustom = () => {
    const t = customText.trim();
    if (t.length < 2) return;
    if (count >= MAX_TESTS) { setError(`You can add up to ${MAX_TESTS} tests per request.`); return; }
    if (!custom.some((c) => c.toLowerCase() === t.toLowerCase())) setCustom((c) => [...c, t]);
    setCustomText("");
  };

  const submit = () => {
    setError(null);
    if (count === 0 && uploads.length === 0) { setError("Upload your prescription or add at least one test."); return; }
    if (uploading > 0) { setError("Please wait for the upload to finish."); return; }
    start(async () => {
      const res = await createRequestAction({ testIds: tests.map((t) => t.id), customTests: custom, imageIds: uploads.map((u) => u.id), notes, service });
      if (res.ok) router.push(`/app/requests/${res.id}?sent=${res.labsNotified}`);
      else setError(res.error);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Camera className="size-4 text-primary-dark" /> Upload your prescription</h2>
          <p className="mb-4 text-sm text-muted">Take a clear photo or choose from your gallery. Images are compressed automatically.</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
            className={cn("rounded-2xl border-2 border-dashed p-6 text-center transition-colors", drag ? "border-primary-dark bg-mint" : "border-border bg-mint-soft")}
          >
            <ImagePlus className="mx-auto mb-2 size-8 text-primary-dark" />
            <p className="text-sm font-medium">Drag &amp; drop a photo here, or</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose prescription images" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            <Button type="button" variant="outline" className="mt-3" onClick={() => fileRef.current?.click()} disabled={uploads.length >= MAX_IMAGES}>Choose photo</Button>
            <p className="mt-2 text-xs text-muted">JPG, PNG or WebP · up to {MAX_IMAGES} pages</p>
          </div>
          {uploading > 0 ? <p role="status" className="mt-3 text-sm text-muted">Compressing &amp; uploading…</p> : null}
          {uploads.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.preview} alt={`Prescription ${u.name}`} className="size-16 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="text-xs text-muted">{fmtKb(u.originalBytes)} → <span className="font-semibold text-primary-dark">{fmtKb(u.bytes)}</span></p>
                  </div>
                  <button type="button" aria-label={`Remove ${u.name}`} onClick={() => removeUpload(u.id)} className="cursor-pointer rounded-lg p-2 text-muted hover:bg-mint hover:text-danger"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><FlaskConical className="size-4 text-primary-dark" /> Or add the tests you need</h2>
          <p className="mb-4 text-sm text-muted">Search the catalogue — you can add one or many ({count}/{MAX_TESTS}). You can combine this with a prescription.</p>
          <RemoteCombobox<{ id: string; name: string; category: { name: string } }>
            endpoint="/api/tests/suggest" minChars={2} clearOnPick ariaLabel="Search diagnostic tests"
            placeholder="Search tests, e.g. HbA1c, thyroid, CBC" icon={<FlaskConical className="size-4" />}
            toOption={(t) => ({ key: t.id, primary: t.name, secondary: t.category.name })}
            onPick={(t) => { if (count >= MAX_TESTS) setError(`You can add up to ${MAX_TESTS} tests per request.`); else if (!tests.some((x) => x.id === t.id)) setTests((l) => [...l, { id: t.id, name: t.name }]); }}
          />
          <div className="mt-3 flex gap-2">
            <input aria-label="Add a test that isn't in the list" placeholder="Not in the list? Type the test name" value={customText} onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm placeholder:text-[#7a8794] focus-visible:border-primary-dark" />
            <Button type="button" variant="outline" onClick={addCustom}><Plus className="size-4" /> Add</Button>
          </div>
          {count > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {[...tests.map((t) => ({ key: t.id, name: t.name, onRemove: () => setTests((l) => l.filter((x) => x.id !== t.id)) })),
                ...custom.map((c) => ({ key: `c-${c}`, name: c, onRemove: () => setCustom((l) => l.filter((x) => x !== c)) }))].map((t) => (
                <li key={t.key} className="flex items-center gap-1 rounded-full bg-mint py-1 pl-3 pr-1 text-sm font-medium text-primary-dark">
                  {t.name}
                  <button type="button" aria-label={`Remove ${t.name}`} onClick={t.onRemove} className="cursor-pointer rounded-full p-1 hover:bg-white/70"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileText className="size-4 text-primary-dark" /> Preferences</h2>
          <div role="radiogroup" aria-label="Sample collection" className="mb-4 flex flex-wrap gap-2">
            {([["ANY", "Either is fine"], ["HOME_COLLECTION", "Home collection"], ["WALK_IN", "I'll visit the lab"]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={service === v} onClick={() => setService(v)}
                className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium", service === v ? "border-primary-dark bg-primary-dark text-white" : "border-border bg-white hover:bg-mint")}>{label}</button>
            ))}
          </div>
          <Textarea aria-label="Notes for the laboratories" placeholder="Anything the labs should know? (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-3 font-semibold">Send to nearby labs</h2>
          <p className="flex items-start gap-2 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0 text-primary-dark" /> {address}</p>
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-mint p-3 text-sm font-medium text-primary-dark" data-testid="labs-nearby">
            <Radar className="size-4" /> {labsNearby === 0 ? `No labs within ${radiusKm} km yet` : `${labsNearby} lab${labsNearby === 1 ? "" : "s"} within ${radiusKm} km will receive this`}
          </p>
          <Link href="/app/profile" className="mt-2 block text-xs text-primary-dark underline">Change address</Link>
          <ul className="mt-4 space-y-1 text-sm text-muted">
            <li>{uploads.length} prescription image{uploads.length === 1 ? "" : "s"}</li>
            <li>{count} test{count === 1 ? "" : "s"}</li>
          </ul>
          {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p> : null}
          <Button type="button" size="lg" className="mt-4 w-full" onClick={submit} disabled={pending || uploading > 0}>{pending ? "Sending…" : "Send request"}</Button>
          <label className="mt-3 flex items-start gap-2 text-xs text-muted"><Checkbox checked readOnly className="mt-0.5" aria-hidden tabIndex={-1} /> Labs see only your first name and area until you accept an offer.</label>
        </div>
      </aside>
    </div>
  );
}
