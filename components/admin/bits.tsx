import Link from "next/link";

export function Pager({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-3 text-sm">
      {page > 1 ? <Link className="rounded-lg border border-border bg-white px-3 py-1.5 font-medium hover:bg-mint" href={hrefFor(page - 1)}>Previous</Link> : null}
      <span className="text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link className="rounded-lg border border-border bg-white px-3 py-1.5 font-medium hover:bg-mint" href={hrefFor(page + 1)}>Next</Link> : null}
    </nav>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-white"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "px-4 py-3 align-middle";
