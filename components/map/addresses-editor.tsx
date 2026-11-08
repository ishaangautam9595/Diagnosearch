"use client";
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { PinPickerMap } from "./pin-picker";
import type { GeoPlace } from "@/lib/client/geocode";

export interface EditableAddress {
  id?: string | null;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude: number | null;
  longitude: number | null;
}

const blank = (n: number): EditableAddress => ({ label: n === 0 ? "Main branch" : `Branch ${n + 1}`, line1: "", line2: "", city: "", pincode: "", latitude: null, longitude: null });

/**
 * Edits one or more lab addresses. Each can be typed manually and/or pinned on a map
 * (search an address, click, or drag the pin — the address fields are filled in for you).
 * The list is submitted as one JSON field named "addresses".
 */
export function AddressesEditor({ initial, fallback }: {
  initial?: EditableAddress[];
  fallback: { lat: number; lng: number; zoom: number };
}) {
  const [list, setList] = useState<(EditableAddress & { key: string })[]>(
    (initial?.length ? initial : [blank(0)]).map((a, i) => ({ ...a, key: `a${i}` })),
  );
  const counter = useRef(list.length);
  // The values we last auto-filled per address, so we only overwrite fields the user hasn't edited.
  const auto = useRef<Record<string, Partial<EditableAddress>>>({});

  const patch = (key: string, p: Partial<EditableAddress>) => setList((l) => l.map((a) => (a.key === key ? { ...a, ...p } : a)));

  const fromPlace = (key: string, g: GeoPlace) =>
    setList((l) => l.map((a) => {
      if (a.key !== key) return a;
      const last = auto.current[key] ?? {};
      const next: Partial<EditableAddress> = {};
      const maybe = (f: "line1" | "city" | "pincode", v: string) => {
        if (v && (!a[f] || a[f] === last[f])) next[f] = v;
      };
      maybe("line1", g.line1); maybe("city", g.city); maybe("pincode", g.pincode);
      auto.current[key] = { line1: next.line1 ?? last.line1, city: next.city ?? last.city, pincode: next.pincode ?? last.pincode };
      return { ...a, ...next };
    }));

  const payload = JSON.stringify(list.map(({ key: _k, ...a }) => { void _k; return a; }));

  return (
    <div className="space-y-5">
      <input type="hidden" name="addresses" value={payload} />
      {list.map((a, i) => (
        <div key={a.key} className="space-y-4 rounded-2xl border border-border bg-white p-4 sm:p-5" role="group" aria-label={`Address ${i + 1}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Address {i + 1}{i === 0 ? <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-primary-dark">Primary</span> : null}</h3>
            {list.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setList((l) => l.filter((x) => x.key !== a.key))}>
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : null}
          </div>
          <PinPickerMap
            value={a.latitude !== null && a.longitude !== null ? { lat: a.latitude, lng: a.longitude } : null}
            onChange={(p) => patch(a.key, { latitude: p.lat, longitude: p.lng })}
            onPlace={(g) => fromPlace(a.key, g)}
            fallback={fallback}
          />
          <p className="text-xs text-muted">
            {a.latitude !== null ? `Pinned at ${a.latitude.toFixed(5)}, ${a.longitude?.toFixed(5)}.` : "Not pinned yet."} Patients see how far you are from them using this pin.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Branch name (optional)" htmlFor={`label-${a.key}`}><Input id={`label-${a.key}`} value={a.label ?? ""} onChange={(e) => patch(a.key, { label: e.target.value })} /></Field>
            <Field label="Street address" htmlFor={`line1-${a.key}`}><Input id={`line1-${a.key}`} required value={a.line1} onChange={(e) => patch(a.key, { line1: e.target.value })} placeholder="Shop / building, street" /></Field>
            <Field label="Landmark / address line 2" htmlFor={`line2-${a.key}`}><Input id={`line2-${a.key}`} value={a.line2 ?? ""} onChange={(e) => patch(a.key, { line2: e.target.value })} /></Field>
            <Field label="City" htmlFor={`city-${a.key}`}><Input id={`city-${a.key}`} required value={a.city ?? ""} onChange={(e) => patch(a.key, { city: e.target.value })} /></Field>
            <Field label="PIN code" htmlFor={`pin-${a.key}`}><Input id={`pin-${a.key}`} required inputMode="numeric" maxLength={6} value={a.pincode ?? ""} onChange={(e) => patch(a.key, { pincode: e.target.value })} /></Field>
          </div>
        </div>
      ))}
      {list.length < 10 ? (
        <Button type="button" variant="outline" onClick={() => setList((l) => [...l, { ...blank(l.length), key: `a${counter.current++}` }])}>
          <Plus className="size-4" /> Add another address
        </Button>
      ) : null}
    </div>
  );
}
