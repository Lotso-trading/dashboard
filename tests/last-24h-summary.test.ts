/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { ClosedPositionsTotals, OpenPosition } from "@lotso-trading/shared";
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
    openedAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    closedAt: Date.now() - 86400000 * 2,
};

const totals24hFixture: ClosedPositionsTotals = {
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
};

const totalsAllFixture: ClosedPositionsTotals = {
    count: 145,
    totalInvested: 5000,
    totalPayout: 5750,
    totalGains: 1200,
    totalLosses: 450,
    netPnl: 750,
    totalShares: 5750,
    avgEntryPrice: 0.52,
    winCount: 95,
    lossCount: 50,
    winRate: 65.5,
    roiPercent: 15.0,
};

Deno.test("useLast24hSummaryStore - initialisation paginée (20/page) et bilans 24h vs Tout", async () => {
    setActivePinia(createPinia());

    const origPaginated = api.getClosedPositionsPaginated;
    const origSummary = api.getClosedSummary;

    try {
        let calledParams: Record<string, unknown> | null = null;
        api.getClosedPositionsPaginated = async (params) => {
            calledParams = params as Record<string, unknown>;
            return {
                items: [mockPos1, mockPos2],
                total: 25,
                page: 1,
                limit: 20,
                totalPages: 2,
                totals: totals24hFixture,
            };
        };
        api.getClosedSummary = async (since) =>
            since !== undefined ? totals24hFixture : totalsAllFixture;

        const store = useLast24hSummaryStore();
        assertEquals(store.timeWindow, "24H");
        assertEquals(store.filterStatus, "ALL");
        assertEquals(store.pageSize, 20);

        await store.loadInitial("24H", "ALL");

        assertEquals(calledParams !== null, true);
        const p = calledParams as unknown as Record<string, unknown>;
        assertEquals(p.page, 1);
        assertEquals(p.limit, 20);
        assertEquals(typeof p.since, "number");

        assertEquals(store.items.length, 2);
        assertEquals(store.total, 25);
        assertEquals(store.totalPages, 2);
        assertEquals(store.totals24h.count, 2);
        assertEquals(store.totalsAll.count, 145);
        assertEquals(store.totalsAll.netPnl, 750);
    } finally {
        api.getClosedPositionsPaginated = origPaginated;
        api.getClosedSummary = origSummary;
    }
});

Deno.test("useLast24hSummaryStore - setPage et setPageSize chargent la page demandée", async () => {
    setActivePinia(createPinia());

    const origPaginated = api.getClosedPositionsPaginated;
    const origSummary = api.getClosedSummary;

    try {
        const calls: Array<{ page?: number; limit?: number }> = [];
        api.getClosedPositionsPaginated = async (params) => {
            calls.push({ page: params?.page, limit: params?.limit });
            if (params?.page === 2) {
                return {
                    items: [mockPos2],
                    total: 25,
                    page: 2,
                    limit: params.limit ?? 20,
                    totalPages: 2,
                    totals: totals24hFixture,
                };
            }
            return {
                items: [mockPos1],
                total: 25,
                page: 1,
                limit: params?.limit ?? 20,
                totalPages: Math.ceil(25 / (params?.limit ?? 20)),
                totals: totals24hFixture,
            };
        };
        api.getClosedSummary = async () => totalsAllFixture;

        const store = useLast24hSummaryStore();
        await store.loadPage(1, "24H", "ALL");
        assertEquals(store.page, 1);
        assertEquals(store.items[0]?.id, "pos-1");

        await store.setPage(2);
        assertEquals(store.page, 2);
        assertEquals(store.items[0]?.id, "pos-2");

        await store.setPageSize(50);
        assertEquals(store.pageSize, 50);
        assertEquals(store.page, 1);
        assertEquals(store.totalPages, 1);
        assertEquals(calls[calls.length - 1], { page: 1, limit: 50 });
    } finally {
        api.getClosedPositionsPaginated = origPaginated;
        api.getClosedSummary = origSummary;
    }
});

Deno.test("useLast24hSummaryStore - setTimeWindow bascule vers ALL_TIME sans since", async () => {
    setActivePinia(createPinia());

    const origPaginated = api.getClosedPositionsPaginated;
    const origSummary = api.getClosedSummary;

    try {
        let passedSince: number | undefined = 123;
        api.getClosedPositionsPaginated = async (params) => {
            passedSince = params?.since !== undefined ? Number(params.since) : undefined;
            return {
                items: [mockPos1, mockPos2, mockPos3],
                total: 3,
                page: 1,
                limit: 20,
                totalPages: 1,
                totals: totalsAllFixture,
            };
        };
        api.getClosedSummary = async () => totalsAllFixture;

        const store = useLast24hSummaryStore();
        await store.loadInitial("24H");
        await store.setTimeWindow("ALL_TIME");

        assertEquals(store.timeWindow, "ALL_TIME");
        assertEquals(passedSince, undefined);
        assertEquals(store.items.length, 3);
        assertEquals(store.totalPages, 1);
    } finally {
        api.getClosedPositionsPaginated = origPaginated;
        api.getClosedSummary = origSummary;
    }
});

Deno.test("useLast24hSummaryStore - handlePositionClosed respecte page 1, pageSize et filtres", () => {
    setActivePinia(createPinia());

    const store = useLast24hSummaryStore();
    store.items = [mockPos1];
    store.total = 1;
    store.page = 1;
    store.pageSize = 2;
    store.timeWindow = "24H";
    store.filterStatus = "ALL";

    const freshPos: OpenPosition = {
        ...mockPos2,
        id: "fresh-pos",
        closedAt: Date.now() - 5000,
    };

    store.handlePositionClosed(freshPos);
    assertEquals(store.items.length, 2);
    assertEquals(store.items[0]?.id, "fresh-pos");
    assertEquals(store.total, 2);

    // Dépassement pageSize : le dernier élément de la page 1 est éjecté et totalPages augmente
    const thirdPos: OpenPosition = {
        ...mockPos1,
        id: "third-pos",
        closedAt: Date.now() - 1000,
    };
    store.handlePositionClosed(thirdPos);
    assertEquals(store.items.length, 2);
    assertEquals(store.items[0]?.id, "third-pos");
    assertEquals(store.total, 3);
    assertEquals(store.totalPages, 2);

    // Position antérieure à 24h : ignorée en mode 24H
    const ancientPos: OpenPosition = {
        ...mockPos3,
        id: "ancient-pos",
        closedAt: Date.now() - 86400000 * 3,
    };

    store.handlePositionClosed(ancientPos);
    assertEquals(store.items.length, 2);
    assertEquals(store.total, 3);
});
