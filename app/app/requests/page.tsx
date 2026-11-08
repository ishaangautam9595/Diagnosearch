import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, Plus, SearchX } from "lucide-react";
import { requirePatientPage } from "@/lib/auth";
import { REQUEST_FILTERS, REQUEST_SORTS, searchPatientRequests, type RequestFilter, type RequestSort } from "@/lib/services/requests";
import { EmptyState } from "@/components/dashboard/bits";
import { Pager } from "@/components/admin/bits";
import { RequestCard } from "@/components/patient/request-card";
import { RequestFilters } from "@/components/patient/request-filters";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { PageHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My requests" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RequestsPage({ searchParams }: PageProps<"/app/requests">) {
  const me = await requirePatientPage();
  const sp = await searchParams;
  const status = one(sp.status), sort = one(sp.sort);
  const data = await searchPatientRequests(me.id, {
    q: one(sp.q),
    filter: (REQUEST_FILTERS as readonly string[]).includes(status ?? "") ? (status as RequestFilter) : "all",
    sort: (REQUEST_SORTS as readonly string[]).includes(sort ?? "") ? (sort as RequestSort) : "newest",
    page: Number(one(sp.page)) || 1,
  });
  const filtered = data.q !== "" || data.filter !== "all";
  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (data.q) next.set("q", data.q);
    if (data.filter !== "all") next.set("status", data.filter);
    if (data.sort !== "newest") next.set("sort", data.sort);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/app/requests?${qs}` : "/app/requests";
  };
  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeading title="My requests" subtitle="Every request you've sent and the offers you've received." actions={<Button asChild><Link href="/app/requests/new"><Plus className="size-4" /> New request</Link></Button>} />
      {data.counts.all === 0 ? (
        <EmptyState icon={<ClipboardList className="size-6" />} title="Nothing here yet" text="Your requests will appear here once you send one." action={<Button asChild><Link href="/app/requests/new">Create a request</Link></Button>} />
      ) : (
        <>
          <RequestFilters q={data.q} filter={data.filter} sort={data.sort} counts={data.counts} />
          {data.items.length === 0 ? (
            <EmptyState icon={<SearchX className="size-6" />} title="No matching requests" text="Try a different search or clear the filters." action={filtered ? <Button asChild variant="outline"><Link href="/app/requests">Clear filters</Link></Button> : undefined} />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted" aria-live="polite">{data.total} request{data.total === 1 ? "" : "s"}{filtered ? " found" : ""}</p>
              <div className="space-y-3">{data.items.map((r) => <RequestCard key={r.id} r={r} />)}</div>
              <Pager page={data.page} pageCount={data.pageCount} hrefFor={hrefFor} />
            </>
          )}
        </>
      )}
    </>
  );
}
