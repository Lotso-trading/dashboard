import type { ExecutedTrade } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";

export const useTradesStore = defineStore("trades", () => {
  const trades = ref<ExecutedTrade[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const hasMore = ref(true);
  const currentPage = ref(1);
  const currentStatus = ref<string | undefined>(undefined);
  const pageSize = 25;

  async function loadInitialTrades(status?: string): Promise<void> {
    isLoading.value = true;
    currentPage.value = 1;
    currentStatus.value = !status || status === "ALL" ? undefined : status;
    hasMore.value = true;

    try {
      const res = await api.getTrades({
        page: 1,
        limit: pageSize,
        status: currentStatus.value,
      });
      trades.value = res.items;
      total.value = res.total;
      hasMore.value = trades.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[TradesStore] Erreur chargement initial trades:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadMoreTrades(): Promise<void> {
    if (isLoadingMore.value || isLoading.value || !hasMore.value) return;

    isLoadingMore.value = true;
    const nextPage = currentPage.value + 1;

    try {
      const res = await api.getTrades({
        page: nextPage,
        limit: pageSize,
        status: currentStatus.value,
      });

      if (res.items.length > 0) {
        // Concaténation avec déduplication
        const existingIds = new Set(trades.value.map((t) => t.id));
        const newItems = res.items.filter((t) => !existingIds.has(t.id));
        trades.value.push(...newItems);
        currentPage.value = nextPage;
      }

      total.value = res.total;
      hasMore.value = trades.value.length < res.total;
    } catch (err: unknown) {
      console.warn("[TradesStore] Erreur chargement scroll trades:", err);
    } finally {
      isLoadingMore.value = false;
    }
  }

  async function fetchTrades(_page = 1, _limit = 25, status?: string): Promise<void> {
    await loadInitialTrades(status);
  }

  function handleTradeCreated(newTrade: ExecutedTrade): void {
    if (currentStatus.value && currentStatus.value !== newTrade.status) {
      return;
    }

    const exists = trades.value.some((t) => t.id === newTrade.id);
    if (!exists) {
      trades.value.unshift(newTrade);
      total.value += 1;
    }
  }

  return {
    trades,
    total,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    currentStatus,
    loadInitialTrades,
    loadMoreTrades,
    fetchTrades,
    handleTradeCreated,
  };
});
