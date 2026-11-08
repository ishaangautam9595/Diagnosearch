import { describe, expect, it } from "vitest";
import { bboxAround, haversineKm } from "@/lib/geo";
import { parseIdentifier } from "@/lib/identifier";
import { normalizePhone } from "@/lib/validation/phone";

describe("geo", () => {
  it("measures distance", () => {
    expect(haversineKm({ lat: 19, lng: 72.8 }, { lat: 19, lng: 72.8 })).toBe(0);
    expect(haversineKm({ lat: 19, lng: 72.8 }, { lat: 20, lng: 72.8 })).toBeCloseTo(111.2, 0);
  });
  it("bounding box contains the circle", () => {
    const b = bboxAround(19, 72.8, 20);
    expect(b.minLat).toBeLessThan(19 - 0.17);
    expect(b.maxLat).toBeGreaterThan(19 + 0.17);
    expect(b.maxLng - b.minLng).toBeGreaterThan(0.36);
  });
});

describe("identifier parsing", () => {
  it("normalises email and Indian mobile numbers", () => {
    expect(parseIdentifier("  Asha@Test.DEV ")).toEqual({ type: "email", value: "asha@test.dev" });
    expect(parseIdentifier("+91 98765-43210")).toEqual({ type: "phone", value: "9876543210" });
    expect(normalizePhone("098765 43210")).toBe("9876543210");
  });
  it("rejects garbage", () => {
    for (const bad of ["", "abc", "12345", "1234567890", "a@b", "@x.com"]) expect(() => parseIdentifier(bad)).toThrow();
  });
});
