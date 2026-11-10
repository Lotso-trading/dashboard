/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { OpenPosition } from "@polymarket-copy/shared";

function getEndDateTimestamp(isoDate?: string): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const time = new Date(isoDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function sortPositionsByExpiry(positions: OpenPosition[], ascending = true): OpenPosition[] {
  return [...positions].sort((a, b) => {
    const timeA = getEndDateTimestamp(a.endDate);
    const timeB = getEndDateTimestamp(b.endDate);
    if (timeA === Number.POSITIVE_INFINITY && timeB === Number.POSITIVE_INFINITY) return 0;
    if (timeA === Number.POSITIVE_INFINITY) return 1;
    if (timeB === Number.POSITIVE_INFINITY) return -1;
    if (timeA !== timeB) return ascending ? timeA - timeB : timeB - timeA;
    return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
  });
}

const mockBasePosition: OpenPosition = {
  id: "pos_1",
  conditionId: "0x111",
  assetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  marketSlug: "slug-1",
  marketQuestion: "Question 1",
  outcomeLabel: "Yes",
  status: "OPEN",
  totalShares: 100,
  avgEntryPrice: 0.5,
  totalInvestedUsdc: 50,
  currentMarketPrice: 0.55,
  currentMarketValueUsdc: 55,
  unrealizedPnlUsdc: 5,
  unrealizedPnlPercent: 10,
  targetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  openedAt: 1700000000,
  updatedAt: 1700000000,
};

Deno.test("sortPositionsByExpiry - trie par date d'échéance croissante (se termine bientôt)", () => {
  const p1: OpenPosition = { ...mockBasePosition, id: "far_future", endDate: "2026-12-01T00:00:00Z" };
  const p2: OpenPosition = { ...mockBasePosition, id: "tomorrow", endDate: "2026-11-11T00:00:00Z" };
  const p3: OpenPosition = { ...mockBasePosition, id: "in_one_hour", endDate: "2026-11-10T16:00:00Z" };
  const p4: OpenPosition = { ...mockBasePosition, id: "no_date", endDate: undefined };

  const sorted = sortPositionsByExpiry([p1, p4, p2, p3], true);

  assertEquals(sorted.map((p) => p.id), ["in_one_hour", "tomorrow", "far_future", "no_date"]);
});

Deno.test("sortPositionsByExpiry - trie par date d'échéance décroissante (se termine plus tard)", () => {
  const p1: OpenPosition = { ...mockBasePosition, id: "far_future", endDate: "2026-12-01T00:00:00Z" };
  const p2: OpenPosition = { ...mockBasePosition, id: "tomorrow", endDate: "2026-11-11T00:00:00Z" };
  const p3: OpenPosition = { ...mockBasePosition, id: "in_one_hour", endDate: "2026-11-10T16:00:00Z" };
  const p4: OpenPosition = { ...mockBasePosition, id: "no_date", endDate: undefined };

  const sorted = sortPositionsByExpiry([p1, p4, p2, p3], false);

  assertEquals(sorted.map((p) => p.id), ["far_future", "tomorrow", "in_one_hour", "no_date"]);
});
