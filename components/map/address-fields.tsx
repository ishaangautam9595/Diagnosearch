"use client";
import { useRef, type Dispatch, type SetStateAction } from "react";
import { Field, Input } from "@/components/ui/form";
import { PinPickerMap } from "./pin-picker";
import type { GeoPlace } from "@/lib/client/geocode";

export interface AddressValue { addressLine: string; city: string; pincode: string; latitude: number | null; longitude: number | null }
export const EMPTY_ADDRESS: AddressValue = { addressLine: "", city: "", pincode: "", latitude: null, longitude: null };

/**
 * One address: search / pin on the map and/or type it. State lives in the parent (pass its `setState`).
 * All updates are functional because a pin move and the address lookup for it can land in the same tick.
 */
export function AddressFields({ value, onChange, center }: {
  value: AddressValue;
  onChange: Dispatch<SetStateAction<AddressValue>>;
  center: { lat: number; lng: number; zoom: number };
}) {
  const last = useRef<Partial<AddressValue>>({});
  const fromPlace = (g: GeoPlace) =>
    onChange((prev) => {
      const next = { ...prev };
      const maybe = (f: "addressLine" | "city" | "pincode", v: string) => {
        // Only overwrite fields the user hasn't edited by hand.
        if (v && (!prev[f] || prev[f] === last.current[f])) next[f] = v;
      };
      maybe("addressLine", g.line1); maybe("city", g.city); maybe("pincode", g.pincode);
      last.current = { addressLine: next.addressLine, city: next.city, pincode: next.pincode };
      return next;
    });
  const set = (patch: Partial<AddressValue>) => onChange((prev) => ({ ...prev, ...patch }));
  return (
    <div className="space-y-4">
      <PinPickerMap
        value={value.latitude !== null && value.longitude !== null ? { lat: value.latitude, lng: value.longitude } : null}
        onChange={(p) => set({ latitude: p.lat, longitude: p.lng })}
        onPlace={fromPlace}
        fallback={center}
      />
      <p className="text-xs text-muted">{value.latitude !== null ? `Pinned at ${value.latitude.toFixed(5)}, ${value.longitude?.toFixed(5)}. Drag the pin to adjust.` : "Not pinned yet — search above or click the map."}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full address" htmlFor="addr-line" className="sm:col-span-2"><Input id="addr-line" name="addressLine" required value={value.addressLine} onChange={(e) => set({ addressLine: e.target.value })} placeholder="House / flat, street, landmark" autoComplete="street-address" /></Field>
        <Field label="City" htmlFor="addr-city"><Input id="addr-city" name="city" required value={value.city} onChange={(e) => set({ city: e.target.value })} autoComplete="address-level2" /></Field>
        <Field label="PIN code" htmlFor="addr-pin"><Input id="addr-pin" name="pincode" required inputMode="numeric" maxLength={6} value={value.pincode} onChange={(e) => set({ pincode: e.target.value })} autoComplete="postal-code" /></Field>
      </div>
    </div>
  );
}
