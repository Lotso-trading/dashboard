/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import { getPolymarketUrl } from "../src/utils/polymarket-url.ts";

Deno.test("getPolymarketUrl - returns canonical event URL when eventSlug is provided", () => {
  const url = getPolymarketUrl({
    eventSlug: "fed-rate-cut-december-2026",
    marketSlug: "fed-rate-cut-50bps",
    marketQuestion: "Will the Fed cut rates by 50bps?",
  });
  assertEquals(url, "https://polymarket.com/event/fed-rate-cut-december-2026/fed-rate-cut-50bps");
});

Deno.test("getPolymarketUrl - returns event URL without marketSlug if identical", () => {
  const url = getPolymarketUrl({
    eventSlug: "ut-02-house-margin-of-victory-2026",
    marketSlug: "ut-02-house-margin-of-victory-2026",
    marketQuestion: "Utah District 2 House Margin of Victory 2026",
  });
  assertEquals(url, "https://polymarket.com/event/ut-02-house-margin-of-victory-2026");
});

Deno.test("getPolymarketUrl - uses /market/{marketSlug} redirect route when only marketSlug is available", () => {
  const url = getPolymarketUrl({
    marketSlug: "will-apple-be-the-largest-company-in-the-world-by-market-cap-on-november-30-2026",
    marketQuestion: "Will Apple be the largest company in the world?",
  });
  assertEquals(
    url,
    "https://polymarket.com/market/will-apple-be-the-largest-company-in-the-world-by-market-cap-on-november-30-2026"
  );
});

Deno.test("getPolymarketUrl - falls back to search when slugs are generic or invalid", () => {
  const url1 = getPolymarketUrl({
    marketSlug: "polymarket-market",
    marketQuestion: "Will Anthropic IPO in 2026?",
  });
  assertEquals(url1, "https://polymarket.com/search?q=Will%20Anthropic%20IPO%20in%202026%3F");

  const url2 = getPolymarketUrl({
    eventSlug: "market",
    marketSlug: "polygon-onchain",
    marketQuestion: "Bitcoin above 100k in 2026?",
  });
  assertEquals(url2, "https://polymarket.com/search?q=Bitcoin%20above%20100k%20in%202026%3F");
});

Deno.test("getPolymarketUrl - falls back to home page when no data is provided or question is generic", () => {
  assertEquals(getPolymarketUrl(null), "https://polymarket.com");
  assertEquals(getPolymarketUrl(undefined), "https://polymarket.com");
  assertEquals(
    getPolymarketUrl({
      marketSlug: "polymarket-market",
      marketQuestion: "Polymarket Question",
    }),
    "https://polymarket.com"
  );
});
