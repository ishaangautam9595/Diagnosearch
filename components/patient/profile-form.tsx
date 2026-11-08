"use client";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { AddressFields, type AddressValue } from "@/components/map/address-fields";
import { updateProfileAction } from "@/app/app/actions";

export function ProfileForm({ name, initial, center }: { name: string; initial: AddressValue; center: { lat: number; lng: number; zoom: number } }) {
  const [address, setAddress] = useState<AddressValue>(initial);
  return (
    <ActionForm action={updateProfileAction} className="space-y-6">
      <Field label="Your name" htmlFor="name"><Input id="name" name="name" defaultValue={name} required /></Field>
      <div>
        <h2 className="mb-2 text-sm font-medium">Your address</h2>
        <p className="mb-3 text-sm text-muted">Labs within 20 km of this pin receive your requests.</p>
        <AddressFields value={address} onChange={setAddress} center={center} />
        <input type="hidden" name="latitude" value={address.latitude ?? ""} />
        <input type="hidden" name="longitude" value={address.longitude ?? ""} />
      </div>
      <SubmitButton size="lg">Save profile</SubmitButton>
    </ActionForm>
  );
}
