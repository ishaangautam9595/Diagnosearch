import { Badge } from "@/components/ui/card";
import type { RequestStatus } from "@/generated/prisma/client";

export function RequestStatusBadge({ status, won }: { status: RequestStatus; won?: boolean }) {
  if (status === "ACCEPTED") return <Badge tone="green">{won ? "Won" : "Offer accepted"}</Badge>;
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>;
  if (status === "CANCELLED") return <Badge tone="red">Cancelled</Badge>;
  return <Badge tone="blue">Open</Badge>;
}

export function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "highlight" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "highlight" ? "border-primary/40 bg-mint" : "border-border bg-white"}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-mint text-primary-dark">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
