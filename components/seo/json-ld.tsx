import { jsonLdString } from "@/lib/seo";

/** Renders one or more schema.org nodes as a single JSON-LD @graph. */
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString({ "@context": "https://schema.org", "@graph": nodes }) }} />;
}
