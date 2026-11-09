import { defineStore } from "pinia";
import { ref } from "vue";
import { api, type GlobalMetrics, type PerformancePoint } from "../api/http-client.ts";

export const useMetricsStore = defineStore("metrics", () => {
  const metrics = ref<GlobalMetrics>({
    totalTradedVolumeUsdc: 0,
    totalCopiedTrades: 0,
    totalRejectedTrades: 0,
    activePositionsCount: 0,
    totalInvestedUsdc: 0,
    currentPositionsValueUsdc: 0,
    unrealizedPnlUsdc: 0,
    activeTargetsCount: 0,
  });

  const performanceHistory = ref<PerformancePoint[]>([]);
  const isLoading = ref(false);

  async function fetchMetrics(): Promise<void> {
    isLoading.value = true;
    try {
      const [m, hist] = await Promise.all([api.getMetrics(), api.getPerformanceHistory()]);
      metrics.value = m;
      performanceHistory.value = hist;
    } catch (err: unknown) {
      console.warn("[MetricsStore] Erreur chargement métriques:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function resetSimulation(): Promise<boolean> {
    try {
      await api.resetSimulation();
      await fetchMetrics();
      return true;
    } catch (err: unknown) {
      console.error("[MetricsStore] Erreur reset simulation:", err);
      return false;
    }
  }

  return {
    metrics,
    performanceHistory,
    isLoading,
    fetchMetrics,
    resetSimulation,
  };
});
