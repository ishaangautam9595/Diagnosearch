import { Skeleton } from "@/components/ui/card";
export default function Loading() {
  return <div className="space-y-4" aria-busy="true"><Skeleton className="h-9 w-64" /><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
}
