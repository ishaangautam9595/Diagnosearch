import { describe, expect, it } from "vitest";
import { absoluteUrl, faqLd, jsonLdString, labLd } from "@/lib/seo";
import robots from "@/app/robots";

describe("seo helpers", () => {
  it("escapes JSON-LD so it can't break out of the script tag", () => {
    const out = jsonLdString({ a: "</script><script>alert(1)</script> & <b>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out).a).toContain("</script>");
  });

  it("builds absolute URLs without double slashes", () => {
    expect(absoluteUrl("/labs/x")).toMatch(/^https?:\/\/[^/]+\/labs\/x$/);
    expect(absoluteUrl("labs/x")).toBe(absoluteUrl("/labs/x"));
  });

  it("builds FAQPage markup", () => {
    const ld = faqLd([{ q: "Q?", a: "A." }]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("A.");
  });

  it("only emits aggregateRating when there are reviews", () => {
    const lab = { slug: "x", name: "X Lab", description: null, phone: "1", accreditation: null, addresses: [{ line1: "a", line2: null, city: "C", pincode: "1" }] };
    expect(labLd(lab, { average: null, count: 0 }, [])).not.toHaveProperty("aggregateRating");
    expect(labLd(lab, { average: 4.46, count: 3 }, [])).toHaveProperty("aggregateRating.ratingValue", 4.5);
  });

  it("keeps public lab pages crawlable while blocking private areas", () => {
    const rules = robots().rules as { disallow: string[] }[];
    for (const r of rules) {
      expect(r.disallow).toContain("/lab/");
      expect(r.disallow).not.toContain("/lab"); // would also block /labs/*
      expect(r.disallow).toContain("/admin");
    }
  });
});
