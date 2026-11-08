/** Central SEO/AEO helpers: canonical site URL, absolute URLs and schema.org (JSON-LD) builders. */

export const SITE_NAME = "DiagnoSearch";
export const SITE_TAGLINE = "Compare diagnostic test prices near you";
export const SITE_DESCRIPTION =
  "Upload a prescription or list the tests you need and diagnostic laboratories within 20 km send you their best prices. Compare lab test offers, chat with labs and book the best one — free for patients.";

/** Production origin; used whenever the app runs in production and NEXT_PUBLIC_SITE_URL isn't set. */
const PRODUCTION_URL = "https://diagnosearch.vercel.app";

/** Public origin. Override with NEXT_PUBLIC_SITE_URL (e.g. a custom domain); localhost only in development. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000")).replace(/\/+$/, "");

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Serialises JSON-LD safely for inlining in a <script> tag (prevents `</script>` / HTML injection). */
export const jsonLdString = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export const organizationLd = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/icon"),
  description: SITE_DESCRIPTION,
  areaServed: { "@type": "Country", name: "India" },
});

export const websiteLd = () => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "en-IN",
  publisher: { "@id": ORG_ID },
});

/** The product itself, described for answer engines. */
export const webApplicationLd = () => ({
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "HealthApplication",
  operatingSystem: "Any (web browser)",
  description: SITE_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: { "@id": ORG_ID },
});

export const faqLd = (faqs: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const howToLd = (name: string, steps: { title: string; text: string }[]) => ({
  "@type": "HowTo",
  name,
  step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text })),
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
});

type LabForLd = {
  slug: string;
  name: string;
  description: string | null;
  phone: string;
  accreditation: string | null;
  addresses: { line1: string; line2: string | null; city: string; pincode: string }[];
};

export const labLd = (
  lab: LabForLd,
  rating: { average: number | null; count: number },
  reviews: { reviewer: string; rating: number; comment: string | null; createdAt: Date }[],
) => ({
  "@type": "DiagnosticLab",
  "@id": absoluteUrl(`/labs/${lab.slug}`) + "#lab",
  name: lab.name,
  url: absoluteUrl(`/labs/${lab.slug}`),
  telephone: lab.phone,
  ...(lab.description ? { description: lab.description } : {}),
  ...(lab.accreditation ? { award: lab.accreditation } : {}),
  address: lab.addresses.map((a) => ({
    "@type": "PostalAddress",
    streetAddress: [a.line1, a.line2].filter(Boolean).join(", "),
    addressLocality: a.city,
    postalCode: a.pincode,
    addressCountry: "IN",
  })),
  ...(rating.count > 0 && rating.average != null
    ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(rating.average.toFixed(1)), reviewCount: rating.count, bestRating: 5, worstRating: 1 } }
    : {}),
  ...(reviews.length
    ? {
        review: reviews.slice(0, 10).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.reviewer },
          datePublished: r.createdAt.toISOString().slice(0, 10),
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          ...(r.comment ? { reviewBody: r.comment } : {}),
        })),
      }
    : {}),
});
