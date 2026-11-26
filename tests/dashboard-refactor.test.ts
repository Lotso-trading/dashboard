/// <reference lib="deno.ns" />
import { assertEquals, assertMatch } from "jsr:@std/assert";
import type {
    ExecutedTrade,
    OpenPosition,
    PeriodSummaryItem,
    TargetTrader,
} from "@lotso-trading/shared";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, ref } from "vue";
import { api } from "../src/api/http-client.ts";
import { DEFAULT_PAGE_SIZE, usePagination } from "../src/composables/use-pagination.ts";
import { usePortfolioMetrics } from "../src/composables/use-portfolio-metrics.ts";
import { useConfigStore } from "../src/stores/use-config.store.ts";
import { useMetricsStore } from "../src/stores/use-metrics.store.ts";
import { usePeriodSummaryStore } from "../src/stores/use-period-summary.store.ts";
import { usePositionsStore } from "../src/stores/use-positions.store.ts";
import { useSystemStore } from "../src/stores/use-system.store.ts";
import { useTradesStore } from "../src/stores/use-trades.store.ts";
import { getClosedPositionOutcome, isClosedPositionWin } from "../src/utils/closed-outcome.ts";
import {
    formatCurrency,
    formatSignedCurrency,
    formatSignedPercent,
    getRelativeExpiry,
    truncateAddress,
} from "../src/utils/formatters.ts";
import { computeTargetPerformance, sortTargets } from "../src/utils/targets-sort.ts";

Deno.test("usePagination - pagine à 20 par défaut, ajuste pageSize et clamp la page", async () => {
    const source = ref(Array.from({ length: 45 }, (_, i) => i + 1));
    const pager = usePagination(source);

    assertEquals(pager.pageSize.value, DEFAULT_PAGE_SIZE);
    assertEquals(pager.page.value, 1);
    assertEquals(pager.totalPages.value, 3);
    assertEquals(pager.paginatedItems.value.length, 20);
    assertEquals(pager.paginatedItems.value[0], 1);

    pager.setPage(3);
    assertEquals(pager.page.value, 3);
    assertEquals(pager.paginatedItems.value.length, 5);
    assertEquals(pager.paginatedItems.value[0], 41);

    // Changement de taille de page revient page 1
    pager.setPageSize(50);
    assertEquals(pager.page.value, 1);
    assertEquals(pager.totalPages.value, 1);
    assertEquals(pager.paginatedItems.value.length, 45);

    // Réduction de la source sur page > maxPages ramène la page dans les bornes
    pager.setPageSize(10);
    pager.setPage(5);
    assertEquals(pager.page.value, 5);
    source.value = [1, 2, 3];
    await nextTick();
    assertEquals(pager.page.value, 1);
    assertEquals(pager.totalPages.value, 1);
});

Deno.test("sortTargets - trie par W/L, winRate, gain (realizedPnl) et trades en ASC/DESC", () => {
    const makeTarget = (
        id: string,
        alias: string,
        stats: Partial<TargetTrader["stats"]>
    ): TargetTrader => ({
        id,
        address: `0x${id.padEnd(40, "0")}`,
        alias,
        enabled: true,
        weightMultiplier: 1.0,
        stats: {
            totalCopiedTrades: 0,
            totalCopiedVolumeUsdc: 0,
            realizedPnlUsdc: 0,
            wonTrades: 0,
            lostTrades: 0,
            winRatePercent: 0,
            ...stats,
        },
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
    });

    const alpha = makeTarget("a", "Alpha", {
        wonTrades: 8,
        lostTrades: 2,
        realizedPnlUsdc: 250,
        totalCopiedTrades: 15,
    }); // wlDiff=+6, winRate=80%, pnl=250, trades=15
    const beta = makeTarget("b", "Beta", {
        wonTrades: 2,
        lostTrades: 5,
        realizedPnlUsdc: -120,
        totalCopiedTrades: 40,
    }); // wlDiff=-3, winRate=28.6%, pnl=-120, trades=40
    const gamma = makeTarget("c", "Gamma", {
        wonTrades: 4,
        lostTrades: 0,
        realizedPnlUsdc: 90,
        totalCopiedTrades: 5,
    }); // wlDiff=+4, winRate=100%, pnl=90, trades=5

    const closed: OpenPosition[] = [];
    const list = [alpha, beta, gamma];
    const perfMap = new Map(list.map((t) => [t.id, computeTargetPerformance(t, closed)]));

    assertEquals(
        sortTargets(list, perfMap, "wl", "desc").map((t) => t.id),
        ["a", "c", "b"]
    );
    assertEquals(
        sortTargets(list, perfMap, "wl", "asc").map((t) => t.id),
        ["b", "c", "a"]
    );
    assertEquals(
        sortTargets(list, perfMap, "winRate", "desc").map((t) => t.id),
        ["c", "a", "b"]
    );
    assertEquals(
        sortTargets(list, perfMap, "realizedPnl", "desc").map((t) => t.id),
        ["a", "c", "b"]
    );
    assertEquals(
        sortTargets(list, perfMap, "realizedPnl", "asc").map((t) => t.id),
        ["b", "c", "a"]
    );
    assertEquals(
        sortTargets(list, perfMap, "trades", "desc").map((t) => t.id),
        ["b", "a", "c"]
    );
    assertEquals(
        sortTargets(list, perfMap, "trades", "asc").map((t) => t.id),
        ["c", "a", "b"]
    );
});

Deno.test("useTradesStore - gère filtres multi-critères, tri et pagination", async () => {
    setActivePinia(createPinia());
    const origGetTrades = api.getTrades;

    try {
        let lastParams: Record<string, unknown> = {};
        const sampleTrade: ExecutedTrade = {
            id: "tr-1",
            detectedTradeId: "det-1",
            targetAddress: "0x1111111111111111111111111111111111111111",
            conditionId: "0xcond1",
            assetAddress: "0xasset",
            marketQuestion: "Will BTC hit 120k?",
            side: "BUY",
            outcomeLabel: "Yes",
            targetPrice: 0.498,
            executedPrice: 0.5,
            shares: 100,
            costUsdc: 50,
            slippagePercent: 0.4,
            status: "FILLED",
            isDryRun: true,
            executedAt: Date.now(),
        };

        api.getTrades = async (params) => {
            lastParams = params as Record<string, unknown>;
            return {
                items: [sampleTrade],
                total: 42,
                page: params?.page ?? 1,
                limit: params?.limit ?? 20,
                totalPages: Math.ceil(42 / (params?.limit ?? 20)),
            };
        };

        const store = useTradesStore();
        assertEquals(store.pageSize, 20);

        await store.setStatusFilter("FILLED");
        assertEquals(lastParams.status, "FILLED");
        assertEquals(lastParams.page, 1);

        await store.setSideFilter("BUY");
        assertEquals(lastParams.side, "BUY");

        await store.setModeFilter("DRY_RUN");
        assertEquals(lastParams.isDryRun, "DRY_RUN");

        await store.setSearch("BTC");
        assertEquals(lastParams.search, "BTC");

        await store.toggleSort("costUsdc");
        assertEquals(lastParams.sortBy, "costUsdc");
        assertEquals(lastParams.sortOrder, "desc");

        await store.toggleSort("costUsdc");
        assertEquals(lastParams.sortOrder, "asc");

        await store.setPageSize(50);
        assertEquals(store.pageSize, 50);
        assertEquals(store.totalPages, 1);

        await store.resetFilters();
        assertEquals(store.filterStatus, "ALL");
        assertEquals(store.filterSide, "ALL");
        assertEquals(store.filterMode, "ALL");
        assertEquals(store.searchQuery, "");
        assertEquals(store.sortBy, "executedAt");
        assertEquals(store.sortOrder, "desc");
    } finally {
        api.getTrades = origGetTrades;
    }
});

Deno.test("usePeriodSummaryStore - change la granularité, le tri et la pagination", async () => {
    setActivePinia(createPinia());
    const origGetPeriodSummary = api.getPeriodSummary;

    try {
        let lastParams: Record<string, unknown> = {};
        const dayItem: PeriodSummaryItem = {
            periodKey: "2026-11-19",
            periodLabel: "19 nov. 2026",
            startTimestamp: 1795046400000,
            endTimestamp: 1795132799999,
            count: 5,
            tradesCount: 7,
            winCount: 4,
            lossCount: 1,
            cancelledCount: 0,
            winRate: 80,
            totalInvested: 200,
            totalPayout: 260,
            totalGains: 80,
            totalLosses: 20,
            netPnl: 60,
            totalShares: 260,
            avgEntryPrice: 0.5,
            roiPercent: 30,
        };

        api.getPeriodSummary = async (params) => {
            lastParams = (params ?? {}) as unknown as Record<string, unknown>;
            return {
                granularity: params?.granularity ?? "day",
                items: [dayItem],
                total: 1,
                page: params?.page ?? 1,
                limit: params?.limit ?? 20,
                totalPages: 1,
                totals: {
                    count: 5,
                    totalInvested: 200,
                    totalPayout: 260,
                    totalGains: 80,
                    totalLosses: 20,
                    netPnl: 60,
                    totalShares: 260,
                    avgEntryPrice: 0.5,
                    winCount: 4,
                    lossCount: 1,
                    cancelledCount: 0,
                    winRate: 80,
                    roiPercent: 30,
                },
                bestPeriod: dayItem,
                worstPeriod: dayItem,
                avgNetPnlPerPeriod: 60,
            };
        };

        const store = usePeriodSummaryStore();
        await store.loadPage(1);
        assertEquals(lastParams.granularity, "day");
        assertEquals(store.items.length, 1);
        assertEquals(store.bestPeriod?.periodKey, "2026-11-19");

        await store.setGranularity("month");
        assertEquals(store.granularity, "month");
        assertEquals(lastParams.granularity, "month");
        assertEquals(lastParams.page, 1);

        await store.toggleSort("netPnl");
        assertEquals(lastParams.sortBy, "netPnl");
        assertEquals(lastParams.sortOrder, "desc");
    } finally {
        api.getPeriodSummary = origGetPeriodSummary;
    }
});

Deno.test("useSystemStore - récupère les versions et applique les mises à jour temps réel", async () => {
    setActivePinia(createPinia());
    const origGetVersions = api.getSystemVersions;

    try {
        api.getSystemVersions = async () => ({
            api: "1.0.0-develop.5",
            bot: "1.0.0-develop.6",
            shared: "1.0.0-develop.4",
            botOnline: true,
            updatedAt: 1700000000000,
        });

        const store = useSystemStore();
        await store.fetchVersions();
        assertEquals(store.versions.api, "1.0.0-develop.5");
        assertEquals(store.versions.bot, "1.0.0-develop.6");
        assertEquals(store.versions.shared, "1.0.0-develop.4");
        assertEquals(store.versions.botOnline, true);

        store.handleVersionsUpdated({
            api: "1.0.0-develop.5",
            bot: "1.0.1",
            shared: "1.0.0-develop.4",
            botOnline: true,
            updatedAt: 1700000005000,
        });
        assertEquals(store.versions.bot, "1.0.1");
    } finally {
        api.getSystemVersions = origGetVersions;
    }
});

Deno.test("formatters - formatage monétaire/échéance propre et sans emoji", () => {
    assertEquals(formatCurrency(12.345), "$12.35");
    assertEquals(formatSignedCurrency(15.2), "+$15.20");
    assertEquals(formatSignedCurrency(-8.5), "-$8.50");
    assertEquals(formatSignedPercent(12.34), "+12.3%");
    assertEquals(formatSignedPercent(-4.56), "-4.6%");
    assertEquals(truncateAddress("0x1234567890abcdef1234"), "0x1234...1234");

    const now = Date.UTC(2026, 10, 19, 12, 0, 0);
    const past = getRelativeExpiry(new Date(now - 60_000).toISOString(), now);
    assertEquals(past.label, "Attente oracle");
    assertEquals(past.tone, "warning");

    const soon = getRelativeExpiry(new Date(now + 30 * 60_000).toISOString(), now);
    assertEquals(soon.label, "Dans 30 min");
    assertEquals(soon.tone, "danger");

    const tomorrow = getRelativeExpiry(new Date(now + 26 * 3_600_000).toISOString(), now);
    assertEquals(tomorrow.label, "Demain");
    assertEquals(tomorrow.tone, "warning");

    // Aucun emoji dans les labels générés
    const emojiPattern = /\p{Extended_Pictographic}/u;
    assertEquals(emojiPattern.test(past.label), false);
    assertEquals(emojiPattern.test(soon.label), false);
    assertEquals(emojiPattern.test(tomorrow.label), false);
    assertMatch(formatCurrency(10), /^\$10\.00$/);
});

Deno.test("usePortfolioMetrics - ne confond jamais maxAllocatedCapitalUsdc avec le capital initial", () => {
    setActivePinia(createPinia());

    const configStore = useConfigStore();
    const metricsStore = useMetricsStore();
    const positionsStore = usePositionsStore();

    configStore.config = {
        balancePercentPerTrade: 0.04,
        maxSlippagePercent: 2.5,
        maxCapPerTradeUsdc: 75,
        maxExposurePerMarketUsdc: 200,
        maxExposurePerTargetUsdc: 500,
        minCashReserveUsdc: 100,
        minTradeSizeUsdc: 5,
        minPrice: 0.08,
        maxPrice: 0.92,
        copySellOrders: true,
        dryRun: true,
        simulatedBalanceUsdc: 2500,
        maxAllocatedCapitalUsdc: 2000,
        profitReinvestmentPercent: 50,
        isBotRunning: true,
        isBotOnline: true,
    };

    metricsStore.metrics = {
        totalTradedVolumeUsdc: 5000,
        totalCopiedTrades: 100,
        totalRejectedTrades: 10,
        activePositionsCount: 1,
        closedPositionsCount: 50,
        initialCapitalUsdc: 2500,
        totalInvestedUsdc: 1000,
        currentPositionsValueUsdc: 1050,
        unrealizedPnlUsdc: 50,
        realizedPnlUsdc: 500,
        totalSettledPayoutUsdc: 2500,
        availableCashUsdc: 2000, // 2500 - 1000 + 500
        totalPortfolioValueUsdc: 3050, // 2000 + 1050
        activeTargetsCount: 5,
    };

    positionsStore.positions = [
        {
            id: "open-1",
            conditionId: "0x1",
            assetAddress: "0x1111111111111111111111111111111111111111",
            marketSlug: "m",
            marketQuestion: "Q?",
            outcomeLabel: "Yes",
            status: "OPEN",
            totalShares: 2000,
            avgEntryPrice: 0.5,
            totalInvestedUsdc: 1000,
            currentMarketPrice: 0.525,
            currentMarketValueUsdc: 1050,
            unrealizedPnlUsdc: 50,
            unrealizedPnlPercent: 5,
            targetAddress: "0x2222222222222222222222222222222222222222",
            openedAt: Date.now(),
            updatedAt: Date.now(),
        },
    ];

    const pm = usePortfolioMetrics();
    assertEquals(pm.initialCapitalUsdc.value, 2500);
    assertEquals(pm.availableCashUsdc.value, 2000);
    assertEquals(pm.totalPortfolioValueUsdc.value, 3050);
    // Gain net = 3050 - 2500 = +550 (500 réalisé + 50 latent), jamais +1050 basé sur maxAllocatedCapital!
    assertEquals(pm.overallNetGainUsdc.value, 550);
    assertEquals(Math.round(pm.overallRoiPercent.value * 100) / 100, 22);
});

Deno.test("getClosedPositionOutcome - distingue correctement RESOLVED_WIN/LOSS, WHALE_SELL et MANUAL", () => {
    assertEquals(isClosedPositionWin({ closeReason: "RESOLVED_WIN", realizedPnlUsdc: 20 }), true);
    assertEquals(
        isClosedPositionWin({ closeReason: "RESOLVED_LOSS", realizedPnlUsdc: -20 }),
        false
    );
    assertEquals(isClosedPositionWin({ closeReason: "WHALE_SELL", realizedPnlUsdc: 12.5 }), true);
    assertEquals(isClosedPositionWin({ closeReason: "WHALE_SELL", realizedPnlUsdc: -8 }), false);
    assertEquals(isClosedPositionWin({ closeReason: "MANUAL", realizedPnlUsdc: 5 }), true);

    assertEquals(getClosedPositionOutcome({ closeReason: "WHALE_SELL", realizedPnlUsdc: 12.5 }), {
        isWin: true,
        label: "Vente +",
        variant: "success",
        icon: "trending-up",
    });
    assertEquals(getClosedPositionOutcome({ closeReason: "MANUAL", realizedPnlUsdc: -4 }), {
        isWin: false,
        label: "Manuel -",
        variant: "danger",
        icon: "trending-down",
    });
    assertEquals(
        isClosedPositionWin({ closeReason: "RESOLVED_CANCELLED", realizedPnlUsdc: 2 }),
        false
    );
    assertEquals(
        getClosedPositionOutcome({ closeReason: "RESOLVED_CANCELLED", realizedPnlUsdc: -1.7 }),
        {
            isWin: false,
            isCancelled: true,
            label: "Annulé (50/50)",
            variant: "neutral",
            icon: "ban",
        }
    );
});
