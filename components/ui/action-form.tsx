"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface ActionState { error?: string; ok?: string }
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

export function SubmitButton({ children, pendingText = "Saving…", ...props }: ButtonProps & { pendingText?: string }) {
  const pending = useContext(PendingContext);
  return <Button type="submit" disabled={pending} {...props}>{pending ? pendingText : children}</Button>;
}

/**
 * Form bound to a server action, showing its error / success message.
 * It submits programmatically instead of via `<form action>` because React 19 resets
 * uncontrolled fields after a form action, which would wipe the user's input on a validation error.
 */
export function ActionForm({ action, children, className, resetOnSuccess = false }: { action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnSuccess && state.ok) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state.error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{state.error}</p> : null}
        {state.ok ? <p role="status" className="mt-3 rounded-xl bg-mint p-3 text-sm font-medium text-primary-dark">{state.ok}</p> : null}
      </form>
    </PendingContext.Provider>
  );
}
