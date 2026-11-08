import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, Clock, Home, MapPin, Phone, ShieldQuestion } from "lucide-react";
import { getPublicLab, getRatingBreakdown, getRatingSummaries, listLabReviews } from "@/lib/services/loyalty";
import { Badge, Card } from "@/components/ui/card";
import { Stars } from "@/components/reviews/stars";
import { formatDate } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, breadcrumbLd, labLd } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/labs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lab = await getPublicLab(slug);
  if (!lab) return { title: "Laboratory not found", robots: { index: false, follow: false } };
  const city = lab.addresses[0]?.city;
  const title = `${lab.name}${city ? ` in ${city}` : ""} — reviews, branches & contact`;
  const description = (lab.description?.trim() || `${lab.name}${city ? `, a diagnostic laboratory in ${city}` : ", a diagnostic laboratory"}.`).slice(0, 155) + ` Read patient reviews and send a request on ${SITE_NAME}.`;
  return { title, description, alternates: { canonical: `/labs/${lab.slug}` }, openGraph: { type: "website", title, description, url: `/labs/${lab.slug}` } };
}

/** Public lab profile: details plus every patient rating and review. Visible to anyone. */
export default async function PublicLabPage({ params }: PageProps<"/labs/[slug]">) {
  const { slug } = await params;
  const lab = await getPublicLab(slug);
  if (!lab) notFound();
  const [summary, breakdown, reviews] = await Promise.all([
    getRatingSummaries([lab.id]).then((m) => m.get(lab.id)!),
    getRatingBreakdown(lab.id),
    listLabReviews(lab.id),
  ]);
  return (
    <>
    <JsonLd nodes={[labLd(lab, summary, reviews), breadcrumbLd([{ name: "Home", path: "/" }, { name: lab.name, path: `/labs/${lab.slug}` }])]} />
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="space-y-4 lg:self-start">
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {lab.verificationStatus === "VERIFIED" ? <Badge tone="green"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge><ShieldQuestion className="size-3" /> Not yet verified</Badge>}
            {lab.homeCollectionAvailable ? <Badge tone="blue"><Home className="size-3" /> Home collection</Badge> : null}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{lab.name}</h1>
          {lab.description ? <p className="text-sm text-muted">{lab.description}</p> : null}
          <p className="flex gap-2 text-sm"><Phone className="size-4 shrink-0 text-primary-dark" /> {lab.phone}</p>
          <p className="flex gap-2 text-sm"><Clock className="size-4 shrink-0 text-primary-dark" /> {lab.openingHours ?? "Opening hours not provided"}</p>
          {lab.accreditation ? <p className="text-sm"><span className="text-muted">Accreditation:</span> {lab.accreditation}</p> : null}
        </Card>
        <Card className="space-y-2">
          <h2 className="font-semibold">Branches ({lab.addresses.length})</h2>
          <ul className="space-y-2">
            {lab.addresses.map((a) => (
              <li key={a.id} className="flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary-dark" />
                <span>{a.label ? <strong>{a.label}: </strong> : null}{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="reviews-heading" className="space-y-4">
        <Card>
          <h2 id="reviews-heading" className="mb-3 font-semibold">Patient reviews</h2>
          {summary.count === 0 || summary.average == null ? (
            <p className="text-sm text-muted">No reviews yet. Patients can review a lab after it completes their booking.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="tabular text-4xl font-bold">{summary.average.toFixed(1)}</p>
                <Stars value={summary.average} />
                <p className="mt-1 text-xs text-muted">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
              </div>
              <ul className="min-w-48 flex-1 space-y-1" aria-label="Rating breakdown">
                {breakdown.map((b) => (
                  <li key={b.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted">{b.stars} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(b.count / summary.count) * 100}%` }} /></span>
                    <span className="w-6 text-right tabular text-muted">{b.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        {reviews.map((r) => (
          <Card key={r.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{r.reviewer}</p>
              <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
            </div>
            <Stars value={r.rating} />
            {r.comment ? <p className="text-sm">{r.comment}</p> : null}
          </Card>
        ))}
      </section>
    </div>
    </>
  );
}
