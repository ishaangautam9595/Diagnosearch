import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { listSitemapLabs } from "@/lib/services/public-stats";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/signup"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/partner"), changeFrequency: "monthly", priority: 0.8 },
  ];
  try {
    const labs = await listSitemapLabs();
    return [...pages, ...labs.map((l) => ({ url: absoluteUrl(`/labs/${l.slug}`), lastModified: l.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 }))];
  } catch (e) {
    console.error("sitemap: could not list labs", e); // never fail the build/crawl over the database
    return pages;
  }
}
