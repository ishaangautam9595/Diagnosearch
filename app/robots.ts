import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Private areas. `$` anchors keep "/lab" from also blocking the public "/labs/..." pages. */
const PRIVATE = ["/admin", "/app$", "/app/", "/lab$", "/lab/", "/api/"];

/** Search + answer-engine crawlers are welcomed explicitly (AEO); they follow the same private-area rules. */
const ANSWER_ENGINES = [
  "Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "DuckDuckBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ANSWER_ENGINES, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
