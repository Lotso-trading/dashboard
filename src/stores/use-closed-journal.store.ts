import type { OpenPosition } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import type { ClosedPositionsTotals } from "../utils/positions-summary.ts";

export const useClosedJournalStore = defineStore("closedJournal", () => {
  const items = ref<OpenPosition[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 25;
  const totalPages = ref(1);
  const hasMore = ref(true);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const filterStatus = ref<"ALL" | "WIN" | "LOSS">("ALL");

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

  const totals = ref<ClosedPositionsTotals>({ ...defaultTotals });

  async function loadInitial(status?: "ALL" | "WIN" | "LOSS"): Promise<void> {
    isLoading.value = true;
    page.value = 1;
    filterStatus.value = status ?? "ALL";
    hasMore.value = true;

    try {
      const res = await api.getClosedPositionsPaginated({
        page: 1,
        limit: pageSize,
        status: filterStatus.value,
      });

      items.value = res.items;
      total.value = res.total;
      totalPages.value = res.totalPages;
      totals.value = res.totals || { ...defaultTotals };
      hasMore.value = items.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[ClosedJournalStore] Erreur chargement initial journal:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (isLoadingMore.value || isLoading.value || !hasMore.value) return;

    isLoadingMore.value = true;
    const nextPage = page.value + 1;

    try {
      const res = await api.getClosedPositionsPaginated({
        page: nextPage,
        limit: pageSize,
        status: filterStatus.value,
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
        totals.value = res.totals;
      }
      hasMore.value = items.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[ClosedJournalStore] Erreur chargement scroll journal:", err);
    } finally {
      isLoadingMore.value = false;
    }
  }

  function handlePositionClosed(closedPos: OpenPosition): void {
    const isWin = closedPos.closeReason === "RESOLVED_WIN";
    const matchesFilter =
      filterStatus.value === "ALL" ||
      (filterStatus.value === "WIN" && isWin) ||
      (filterStatus.value === "LOSS" && !isWin);

    if (!matchesFilter) return;

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
    filterStatus,
    totals,
    loadInitial,
    loadMore,
    handlePositionClosed,
  };
});
