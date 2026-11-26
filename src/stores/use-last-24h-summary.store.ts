import type { ClosedPositionsTotals, OpenPosition } from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import { DEFAULT_PAGE_SIZE } from "../composables/use-pagination.ts";
import { isClosedPositionWin } from "../utils/closed-outcome.ts";
import { toMs } from "../utils/positions-summary.ts";

export type TimeWindowScope = "24H" | "ALL_TIME";
export type PositionFilterStatus = "ALL" | "WIN" | "LOSS" | "CANCELLED";

export function createEmptyClosedTotals(): ClosedPositionsTotals {
    return {
        count: 0,
        totalInvested: 0,
        totalPayout: 0,
        totalGains: 0,
        totalLosses: 0,
        netPnl: 0,
        totalShares: 0,
        avgEntryPrice: 0,
        winCount: 0,
        lossCount: 0,
        cancelledCount: 0,
        winRate: 0,
        roiPercent: 0,
    };
}

export const useLast24hSummaryStore = defineStore("last24hSummary", () => {
    const items = ref<OpenPosition[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalPages = ref(1);
    const isLoading = ref(false);

    const timeWindow = ref<TimeWindowScope>("24H");
    const filterStatus = ref<PositionFilterStatus>("ALL");

    // Agrégations globales exactes (non plafonnées à 100) pour le Scoreboard 24h vs Tout
    const totals24h = ref<ClosedPositionsTotals>(createEmptyClosedTotals());
    const totalsAll = ref<ClosedPositionsTotals>(createEmptyClosedTotals());
    const currentTotals = ref<ClosedPositionsTotals>(createEmptyClosedTotals());

    function getSinceTimestamp(): number | undefined {
        if (timeWindow.value === "24H") {
            return Date.now() - 24 * 60 * 60 * 1000;
        }
        return undefined;
    }

    async function loadClosedSummaries(): Promise<void> {
        try {
            const since24h = Date.now() - 24 * 60 * 60 * 1000;
            const [res24h, resAll] = await Promise.all([
                api.getClosedSummary(since24h),
                api.getClosedSummary(),
            ]);
            totals24h.value = res24h;
            totalsAll.value = resAll;
        } catch (err: unknown) {
            console.warn("[Last24hSummaryStore] Erreur chargement bilans 24h/Tout:", err);
        }
    }

    async function loadPage(
        targetPage = page.value,
        window?: TimeWindowScope,
        status?: PositionFilterStatus
    ): Promise<void> {
        if (window !== undefined) timeWindow.value = window;
        if (status !== undefined) filterStatus.value = status;

        isLoading.value = true;
        page.value = Math.max(1, targetPage);

        try {
            const since = getSinceTimestamp();
            const res = await api.getClosedPositionsPaginated({
                page: page.value,
                limit: pageSize.value,
                status: filterStatus.value,
                since,
            });

            items.value = res.items;
            total.value = res.total;
            page.value = res.page;
            totalPages.value = Math.max(1, res.totalPages);
            currentTotals.value = res.totals || createEmptyClosedTotals();

            if (filterStatus.value === "ALL") {
                if (timeWindow.value === "24H") {
                    totals24h.value = currentTotals.value;
                } else {
                    totalsAll.value = currentTotals.value;
                }
            }
        } catch (err: unknown) {
            console.warn("[Last24hSummaryStore] Erreur chargement page:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function loadInitial(
        window?: TimeWindowScope,
        status?: PositionFilterStatus
    ): Promise<void> {
        await Promise.all([loadPage(1, window, status), loadClosedSummaries()]);
    }

    async function setPage(nextPage: number): Promise<void> {
        await loadPage(nextPage);
    }

    async function setPageSize(nextSize: number): Promise<void> {
        pageSize.value = Math.min(100, Math.max(1, Math.floor(nextSize)));
        await loadPage(1);
    }

    async function setTimeWindow(newWindow: TimeWindowScope): Promise<void> {
        if (timeWindow.value === newWindow) return;
        await loadPage(1, newWindow, filterStatus.value);
    }

    async function setFilterStatus(newStatus: PositionFilterStatus): Promise<void> {
        if (filterStatus.value === newStatus) return;
        await loadPage(1, timeWindow.value, newStatus);
    }

    function handlePositionClosed(closedPos: OpenPosition): void {
        const isCancelled = closedPos.closeReason === "RESOLVED_CANCELLED";
        const isWin = isClosedPositionWin(closedPos);
        const matchesStatus =
            filterStatus.value === "ALL" ||
            (filterStatus.value === "CANCELLED" && isCancelled) ||
            (filterStatus.value === "WIN" && !isCancelled && isWin) ||
            (filterStatus.value === "LOSS" && !isCancelled && !isWin);

        if (!matchesStatus) return;

        if (timeWindow.value === "24H") {
            const timeMs = toMs(closedPos.closedAt) || toMs(closedPos.updatedAt);
            const isWithin24h = timeMs >= Date.now() - 24 * 60 * 60 * 1000;
            if (!isWithin24h) return;
        }

        if (page.value !== 1) {
            total.value += 1;
            totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
            return;
        }

        const existingIdx = items.value.findIndex((p) => p.id === closedPos.id);
        if (existingIdx !== -1) {
            items.value[existingIdx] = closedPos;
        } else {
            items.value.unshift(closedPos);
            if (items.value.length > pageSize.value) {
                items.value.pop();
            }
            total.value += 1;
            totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
        }
    }

    return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        isLoading,
        timeWindow,
        filterStatus,
        totals24h,
        totalsAll,
        currentTotals,
        loadClosedSummaries,
        loadPage,
        loadInitial,
        setPage,
        setPageSize,
        setTimeWindow,
        setFilterStatus,
        handlePositionClosed,
    };
});
