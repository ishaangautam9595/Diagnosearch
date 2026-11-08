"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { AddressFields, EMPTY_ADDRESS, type AddressValue } from "@/components/map/address-fields";
import { loginAction, signupAction } from "@/app/(auth)/actions";

/**
 * Sign in (patients and lab partners) or sign up (patients) with a mobile number or email and a password.
 * Sign-up also collects the patient's name and a pinned address (used to find labs within 20 km).
 */
export function AuthForm({ mode, center }: { mode: "login" | "signup"; center: { lat: number; lng: number; zoom: number } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);

  const validateSignup = () => {
    if (name.trim().length < 2) return "Enter your name.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letters and at least one number in your password.";
    if (password !== confirm) return "The two passwords don't match.";
    if (address.latitude === null) return "Pin your address on the map so we can find labs near you.";
    if (address.addressLine.trim().length < 5 || address.city.trim().length < 2 || !/^\d{6}$/.test(address.pincode)) return "Complete your address (street, city and 6-digit PIN code).";
    return null;
  };

  const submit = () => {
    setError(null);
    const v = mode === "signup" ? validateSignup() : !identifier.trim() || !password ? "Enter your mobile number or email and your password." : null;
    if (v) { setError(v); return; }
    start(async () => {
      const res = mode === "login" ? await loginAction(identifier, password) : await signupAction({ name, identifier, password, ...address });
      if (res.ok) { router.push(res.redirectTo); router.refresh(); } else setError(res.error);
    });
  };

  const eye = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-foreground">
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5" noValidate>
      {mode === "signup" ? (
        <Field label="Your name" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
      ) : null}
      <Field label="Mobile number or email" htmlFor="identifier">
        <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" inputMode="email" placeholder="98765 43210 or you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters, with letters and a number" : undefined}>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="pr-10" />
          {eye}
        </div>
      </Field>
      {mode === "signup" ? (
        <>
          <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Your address</legend>
            <p className="text-sm text-muted">Pin your location — labs within 20 km of it will receive your requests.</p>
            <AddressFields value={address} onChange={setAddress} center={center} />
          </fieldset>
        </>
      ) : null}

      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted"><ShieldCheck className="size-3.5" /> Your details are shared only with labs you choose to chat with.</p>
      {mode === "login" ? <p className="text-center text-xs text-muted">Forgot your password? Contact support and we&apos;ll issue a temporary one.</p> : null}
      <p className="text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link className="font-semibold text-primary-dark underline" href="/signup">Create an account</Link></> : <>Already have an account? <Link className="font-semibold text-primary-dark underline" href="/login">Sign in</Link></>}
      </p>
    </form>
  );
}
