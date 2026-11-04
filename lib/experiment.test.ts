import { describe, expect, it } from "vitest";
import {
  DEMO_VISITOR_ID,
  FIXED_CASE,
  MESSAGES,
  OFFER,
  assignVariant,
  conversionRate,
  differenceInPoints,
  fnv1a32,
  formatPercent,
  formatPoints,
  isCrawler,
  isVisitorId,
  parseCountRow,
  parsePreview,
  parseVariant,
  toCounts,
} from "./experiment";

describe("assignVariant", () => {
  it("returns the same variant for the same id every time", () => {
    const first = assignVariant("lab-visitor-demo-01");
    for (let i = 0; i < 100; i++) {
      expect(assignVariant("lab-visitor-demo-01")).toBe(first);
    }
  });

  it("places the demo visitor in a documented, stable variant", () => {
    expect(fnv1a32("lab-visitor-demo-01")).toBe(fnv1a32("lab-visitor-demo-01"));
    expect(assignVariant("lab-visitor-demo-01")).toBe(
      fnv1a32("lab-visitor-demo-01") % 2 === 0 ? "a" : "b",
    );
  });

  it("matches the reference FNV-1a 32-bit vectors", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("splits a population of ids into both variants", () => {
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) counts[assignVariant(`visitor-${i}`)]++;
    expect(counts.a).toBeGreaterThan(800);
    expect(counts.b).toBeGreaterThan(800);
  });
});

describe("conversionRate", () => {
  it("divides conversions by impressions", () => {
    expect(conversionRate({ impressions: 240, conversions: 18 })).toBeCloseTo(0.075, 10);
  });

  it("does not exist without impressions", () => {
    expect(conversionRate({ impressions: 0, conversions: 0 })).toBeNull();
  });
});

describe("fixed case", () => {
  const rateA = conversionRate(FIXED_CASE.a);
  const rateB = conversionRate(FIXED_CASE.b);

  it("keeps the fixed counts", () => {
    expect(FIXED_CASE.a).toEqual({ impressions: 240, conversions: 18 });
    expect(FIXED_CASE.b).toEqual({ impressions: 236, conversions: 31 });
  });

  it("formats A as 7,50% and B as 13,14%", () => {
    expect(formatPercent(rateA)).toBe("7,50%");
    expect(formatPercent(rateB)).toBe("13,14%");
  });

  it("formats B − A as 5,64 pp", () => {
    expect(formatPoints(differenceInPoints(rateA, rateB))).toBe("5,64 pp");
  });

  it("has no difference when one rate does not exist", () => {
    expect(differenceInPoints(null, rateB)).toBeNull();
    expect(formatPoints(null)).toBe("Sin dato");
    expect(formatPercent(null)).toBe("Sin impresiones");
  });
});

describe("copy and offer", () => {
  it("keeps titles within 50–60 and descriptions within 140–160 characters", () => {
    for (const message of Object.values(MESSAGES)) {
      expect(message.title.length).toBeGreaterThanOrEqual(50);
      expect(message.title.length).toBeLessThanOrEqual(60);
      expect(message.description.length).toBeGreaterThanOrEqual(140);
      expect(message.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("changes the message between variants", () => {
    expect(MESSAGES.a.headline).not.toBe(MESSAGES.b.headline);
    expect(MESSAGES.a.cta).not.toBe(MESSAGES.b.cta);
  });

  it("keeps a single offer", () => {
    expect(OFFER).toEqual({
      startDate: "14 de abril",
      durationWeeks: 8,
      groupSize: 12,
      trades: ["carpintería", "electricidad", "cocina"],
    });
  });
});

describe("input validation", () => {
  it("accepts only a or b as variant", () => {
    expect(parseVariant("a")).toBe("a");
    expect(parseVariant("b")).toBe("b");
    expect(parseVariant("B")).toBeNull();
    expect(parseVariant("c")).toBeNull();
    expect(parseVariant(undefined)).toBeNull();
  });

  it("accepts only a or b as preview", () => {
    expect(parsePreview("b")).toBe("b");
    expect(parsePreview(["a", "b"])).toBe("a");
    expect(parsePreview("x")).toBeNull();
  });

  it("accepts only UUID visitor ids", () => {
    expect(isVisitorId("6f1c1d1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f")).toBe(true);
    expect(isVisitorId("lab-visitor-demo-01")).toBe(false);
    expect(isVisitorId("")).toBe(false);
    expect(isVisitorId(undefined)).toBe(false);
  });

  it("validates count rows read from the log", () => {
    expect(parseCountRow({ variant: "a", type: "impression", total: "3" })).toEqual({
      variant: "a",
      type: "impression",
      total: 3,
    });
    expect(parseCountRow({ variant: "z", type: "impression", total: "3" })).toBeNull();
    expect(parseCountRow({ variant: "a", type: "click", total: "3" })).toBeNull();
    expect(parseCountRow({ variant: "a", type: "conversion", total: "-1" })).toBeNull();
    expect(parseCountRow({ variant: "a", type: "conversion", total: "1.5" })).toBeNull();
    expect(parseCountRow(null)).toBeNull();
  });
});

describe("toCounts", () => {
  it("folds rows into counts and fills missing variants with zero", () => {
    expect(
      toCounts([
        { variant: "a", type: "impression", total: 4 },
        { variant: "a", type: "conversion", total: 1 },
      ]),
    ).toEqual({ a: { impressions: 4, conversions: 1 }, b: { impressions: 0, conversions: 0 } });
  });
});

describe("isCrawler", () => {
  it("detects common crawlers and leaves browsers alone", () => {
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe(false);
    expect(isCrawler(null)).toBe(false);
  });
});

describe("demo visitor", () => {
  it("lab-visitor-demo-01 hashes to 0xe13ebb3b (odd) and always lands in B", () => {
    expect(fnv1a32(DEMO_VISITOR_ID)).toBe(0xe13ebb3b);
    expect([1, 2, 3].map(() => assignVariant(DEMO_VISITOR_ID))).toEqual(["b", "b", "b"]);
  });
});
