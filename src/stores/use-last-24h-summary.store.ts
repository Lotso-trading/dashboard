import type { OpenPosition } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import { type ClosedPositionsTotals, toMs } from "../utils/positions-summary.ts";

export type TimeWindowScope = "24H" | "ALL_TIME";
export type PositionFilterStatus = "ALL" | "WIN" | "LOSS";

const defaultTotals: ClosedPositionsTotals = {
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
  winRate: 0,
  roiPercent: 0,
};

export const useLast24hSummaryStore = defineStore("last24hSummary", () => {
  const items = ref<OpenPosition[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 25;
  const totalPages = ref(1);
  const hasMore = ref(true);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);

  const timeWindow = ref<TimeWindowScope>("24H");
  const filterStatus = ref<PositionFilterStatus>("ALL");

  // Totaux 24h pour les 4 KPIs principaux
  const totals24h = ref<ClosedPositionsTotals>({ ...defaultTotals });
  // Totaux de la sélection active (filtrée)
  const currentTotals = ref<ClosedPositionsTotals>({ ...defaultTotals });

  function getSinceTimestamp(): number | undefined {
    if (timeWindow.value === "24H") {
      return Date.now() - 24 * 60 * 60 * 1000;
    }
    return undefined;
  }

  async function loadInitial(
    window?: TimeWindowScope,
    status?: PositionFilterStatus
  ): Promise<void> {
    if (window !== undefined) timeWindow.value = window;
    if (status !== undefined) filterStatus.value = status;

    isLoading.value = true;
    page.value = 1;
    hasMore.value = true;

    try {
      const since = getSinceTimestamp();
      const res = await api.getClosedPositionsPaginated({
        page: 1,
        limit: pageSize,
        status: filterStatus.value,
        since,
      });

      items.value = res.items;
      total.value = res.total;
      totalPages.value = res.totalPages;
      currentTotals.value = res.totals || { ...defaultTotals };

      if (timeWindow.value === "24H" && filterStatus.value === "ALL") {
        totals24h.value = res.totals || { ...defaultTotals };
      } else if (totals24h.value.count === 0 && timeWindow.value === "24H") {
        totals24h.value = res.totals || { ...defaultTotals };
      }

      hasMore.value = items.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[Last24hSummaryStore] Erreur chargement initial:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (isLoadingMore.value || isLoading.value || !hasMore.value) return;

    isLoadingMore.value = true;
    const nextPage = page.value + 1;

    try {
      const since = getSinceTimestamp();
      const res = await api.getClosedPositionsPaginated({
        page: nextPage,
        limit: pageSize,
        status: filterStatus.value,
        since,
      });

      if (res.items.length > 0) {
        const existingIds = new Set(items.value.map((p) => p.id));
        const newItems = res.items.filter((p) => !existingIds.has(p.id));
        items.value.push(...newItems);
        page.value = nextPage;
      }

      total.value = res.total;
      totalPages.value = res.totalPages;
      if (res.totals) {
        currentTotals.value = res.totals;
        if (timeWindow.value === "24H" && filterStatus.value === "ALL") {
          totals24h.value = res.totals;
        }
      }
      hasMore.value = items.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[Last24hSummaryStore] Erreur chargement infinite scroll:", err);
    } finally {
      isLoadingMore.value = false;
    }
  }

  async function setTimeWindow(newWindow: TimeWindowScope): Promise<void> {
    if (timeWindow.value === newWindow) return;
    await loadInitial(newWindow, filterStatus.value);
  }

  async function setFilterStatus(newStatus: PositionFilterStatus): Promise<void> {
    if (filterStatus.value === newStatus) return;
    await loadInitial(timeWindow.value, newStatus);
  }

  function handlePositionClosed(closedPos: OpenPosition): void {
    const isWin = closedPos.closeReason === "RESOLVED_WIN";
    const matchesStatus =
      filterStatus.value === "ALL" ||
      (filterStatus.value === "WIN" && isWin) ||
      (filterStatus.value === "LOSS" && !isWin);

    if (!matchesStatus) return;

    if (timeWindow.value === "24H") {
      const timeMs = toMs(closedPos.closedAt) || toMs(closedPos.updatedAt);
      const isWithin24h = timeMs >= Date.now() - 24 * 60 * 60 * 1000;
      if (!isWithin24h) return;
    }

    const existingIdx = items.value.findIndex((p) => p.id === closedPos.id);
    if (existingIdx !== -1) {
      items.value[existingIdx] = closedPos;
    } else {
      items.value.unshift(closedPos);
      total.value += 1;
    }
  }

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
    isLoading,
    isLoadingMore,
    timeWindow,
    filterStatus,
    totals24h,
    currentTotals,
    loadInitial,
    loadMore,
    setTimeWindow,
    setFilterStatus,
    handlePositionClosed,
  };
});
