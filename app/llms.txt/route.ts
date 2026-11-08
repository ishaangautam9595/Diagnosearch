import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo";

/** llms.txt — a concise, crawler-friendly summary for AI answer engines (https://llmstxt.org). */
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free web platform in India that connects patients with diagnostic laboratories. It is not a laboratory or a medical provider and gives no medical advice.

## How it works
1. A patient signs up and pins their address.
2. They upload a prescription photo and/or pick the tests they need.
3. Every approved laboratory within 20 km receives the request and replies with its best total price.
4. The patient compares offers, chats with labs and accepts one. The other offers and chats are deleted.

## Privacy
- Labs see only the patient's first name and area until an offer is accepted.
- Prescription images are visible only to the patient, the labs that received the request, and administrators.
- There is no payment on the platform; patients pay the laboratory directly.

## Pages
- [Home, how it works and FAQ](${absoluteUrl("/")}): overview and frequently asked questions
- [Become a lab partner](${absoluteUrl("/partner")}): diagnostic laboratories can apply to receive patient requests
- [Create an account](${absoluteUrl("/signup")}): patient sign-up
- [Sitemap](${absoluteUrl("/sitemap.xml")}): all public pages, including each partner laboratory profile with patient reviews
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
