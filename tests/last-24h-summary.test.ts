/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { OpenPosition } from "@polymarket-copy/shared";
import { createPinia, setActivePinia } from "pinia";
import { api } from "../src/api/http-client.ts";
import { useLast24hSummaryStore } from "../src/stores/use-last-24h-summary.store.ts";

const mockPos1: OpenPosition = {
  id: "pos-1",
  conditionId: "0x111",
  assetAddress: "0xaaa",
  marketSlug: "market-1",
  marketQuestion: "Will Trump win in 2024?",
  outcomeLabel: "Yes",
  status: "CLOSED",
  closeReason: "RESOLVED_WIN",
  totalShares: 100,
  avgEntryPrice: 0.5,
  totalInvestedUsdc: 50,
  settledPayoutUsdc: 100,
  realizedPnlUsdc: 50,
  currentMarketPrice: 1,
  currentMarketValueUsdc: 100,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0xaaa",
  openedAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1800000,
  closedAt: Date.now() - 1800000,
};

const mockPos2: OpenPosition = {
  id: "pos-2",
  conditionId: "0x222",
  assetAddress: "0xbbb",
  marketSlug: "market-2",
  marketQuestion: "Will Fed cut rates?",
  outcomeLabel: "No",
  status: "CLOSED",
  closeReason: "RESOLVED_LOSS",
  totalShares: 80,
  avgEntryPrice: 0.5,
  totalInvestedUsdc: 40,
  settledPayoutUsdc: 0,
  realizedPnlUsdc: -40,
  currentMarketPrice: 0,
  currentMarketValueUsdc: 0,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0xbbb",
  openedAt: Date.now() - 7200000,
  updatedAt: Date.now() - 3600000,
  closedAt: Date.now() - 3600000,
};

const mockPos3: OpenPosition = {
  id: "pos-3",
  conditionId: "0x333",
  assetAddress: "0xccc",
  marketSlug: "market-3",
  marketQuestion: "Will ETH hit 4000?",
  outcomeLabel: "Yes",
  status: "CLOSED",
  closeReason: "RESOLVED_WIN",
  totalShares: 60,
  avgEntryPrice: 0.6,
  totalInvestedUsdc: 36,
  settledPayoutUsdc: 60,
  realizedPnlUsdc: 24,
  currentMarketPrice: 1,
  currentMarketValueUsdc: 60,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0xccc",
  openedAt: Date.now() - 86400000 * 2, // 2 jours plus tôt
  updatedAt: Date.now() - 86400000 * 2,
  closedAt: Date.now() - 86400000 * 2,
};

Deno.test("useLast24hSummaryStore - initialisation et chargement de la première page avec since 24h", async () => {
  setActivePinia(createPinia());

  let calledParams: Record<string, unknown> | null = null;
  // Mock API call
  api.getClosedPositionsPaginated = async (params) => {
    calledParams = params as Record<string, unknown>;
    return {
      items: [mockPos1, mockPos2],
      total: 3,
      page: 1,
      limit: 25,
      totalPages: 2,
      totals: {
        count: 2,
        totalInvested: 90,
        totalPayout: 100,
        totalGains: 50,
        totalLosses: 40,
        netPnl: 10,
        totalShares: 180,
        avgEntryPrice: 0.5,
        winCount: 1,
        lossCount: 1,
        winRate: 50,
        roiPercent: 11.1,
      },
    };
  };

  const store = useLast24hSummaryStore();
  assertEquals(store.timeWindow, "24H");
  assertEquals(store.filterStatus, "ALL");

  await store.loadInitial("24H", "ALL");

  assertEquals(calledParams !== null, true);
  const p = calledParams as unknown as Record<string, unknown>;
  assertEquals(p.page, 1);
  assertEquals(p.limit, 25);
  assertEquals(typeof p.since, "number");

  assertEquals(store.items.length, 2);
  assertEquals(store.total, 3);
  assertEquals(store.hasMore, true);
  assertEquals(store.totals24h.count, 2);
  assertEquals(store.totals24h.winCount, 1);
  assertEquals(store.totals24h.lossCount, 1);
});

Deno.test("useLast24hSummaryStore - loadMore charge la page suivante et déduplique", async () => {
  setActivePinia(createPinia());

  api.getClosedPositionsPaginated = async (params) => {
    if (params?.page === 1) {
      return {
        items: [mockPos1],
        total: 2,
        page: 1,
        limit: 1,
        totalPages: 2,
        totals: {
          count: 2,
          totalInvested: 90,
          totalPayout: 100,
          totalGains: 50,
          totalLosses: 40,
          netPnl: 10,
          totalShares: 180,
          avgEntryPrice: 0.5,
          winCount: 1,
          lossCount: 1,
          winRate: 50,
          roiPercent: 11.1,
        },
      };
    }
    // Page 2 avec pos-1 (doublon test) et pos-2 (nouvel élément)
    return {
      items: [mockPos1, mockPos2],
      total: 2,
      page: 2,
      limit: 1,
      totalPages: 2,
      totals: {
        count: 2,
        totalInvested: 90,
        totalPayout: 100,
        totalGains: 50,
        totalLosses: 40,
        netPnl: 10,
        totalShares: 180,
        avgEntryPrice: 0.5,
        winCount: 1,
        lossCount: 1,
        winRate: 50,
        roiPercent: 11.1,
      },
    };
  };

  const store = useLast24hSummaryStore();
  await store.loadInitial("24H", "ALL");
  assertEquals(store.items.length, 1);
  assertEquals(store.hasMore, true);

  await store.loadMore();

  assertEquals(store.items.length, 2);
  assertEquals(store.page, 2);
  assertEquals(store.hasMore, false);
});

Deno.test("useLast24hSummaryStore - setTimeWindow bascule vers ALL_TIME sans since", async () => {
  setActivePinia(createPinia());

  let passedSince: number | undefined = 123;
  api.getClosedPositionsPaginated = async (params) => {
    passedSince = params?.since !== undefined ? Number(params.since) : undefined;
    return {
      items: [mockPos1, mockPos2, mockPos3],
      total: 3,
      page: 1,
      limit: 25,
      totalPages: 1,
      totals: {
        count: 3,
        totalInvested: 126,
        totalPayout: 160,
        totalGains: 74,
        totalLosses: 40,
        netPnl: 34,
        totalShares: 240,
        avgEntryPrice: 0.525,
        winCount: 2,
        lossCount: 1,
        winRate: 66.7,
        roiPercent: 27.0,
      },
    };
  };

  const store = useLast24hSummaryStore();
  await store.loadInitial("24H");
  await store.setTimeWindow("ALL_TIME");

  assertEquals(store.timeWindow, "ALL_TIME");
  assertEquals(passedSince, undefined);
  assertEquals(store.items.length, 3);
  assertEquals(store.hasMore, false);
});

Deno.test("useLast24hSummaryStore - handlePositionClosed intègre les fermetures temps réel respectant les filtres", () => {
  setActivePinia(createPinia());

  const store = useLast24hSummaryStore();
  store.items = [mockPos1];
  store.total = 1;
  store.timeWindow = "24H";
  store.filterStatus = "ALL";

  // Nouvelle position dans les 24h
  const freshPos: OpenPosition = {
    ...mockPos2,
    id: "fresh-pos",
    closedAt: Date.now() - 5000,
  };

  store.handlePositionClosed(freshPos);
  assertEquals(store.items.length, 2);
  assertEquals(store.items[0]?.id, "fresh-pos");
  assertEquals(store.total, 2);

  // Position antérieure à 24h : ignorée en mode 24H
  const ancientPos: OpenPosition = {
    ...mockPos3,
    id: "ancient-pos",
    closedAt: Date.now() - 86400000 * 3,
  };

  store.handlePositionClosed(ancientPos);
  assertEquals(store.items.length, 2);
  assertEquals(store.total, 2);
});
