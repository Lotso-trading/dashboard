import type { OpenPosition } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "../api/http-client.ts";

export const usePositionsStore = defineStore("positions", () => {
  const positions = ref<OpenPosition[]>([]);
  const closedPositions = ref<OpenPosition[]>([]);
  const isLoading = ref(false);
  const isSettling = ref(false);

  const totalUnrealizedPnlUsdc = computed(() => {
    return positions.value.reduce((acc, pos) => acc + (pos.unrealizedPnlUsdc || 0), 0);
  });

  const totalPositionsValueUsdc = computed(() => {
    return positions.value.reduce((acc, pos) => acc + (pos.currentMarketValueUsdc || 0), 0);
  });

  const totalInvestedUsdc = computed(() => {
    return positions.value.reduce((acc, pos) => acc + (pos.totalInvestedUsdc || 0), 0);
  });

  const totalPayoutPotentialUsdc = computed(() => {
    return positions.value.reduce((acc, pos) => acc + (pos.totalShares || 0), 0);
  });

  const totalRealizedPnlUsdc = computed(() => {
    return closedPositions.value.reduce((acc, pos) => acc + (pos.realizedPnlUsdc || 0), 0);
  });

  const totalSettledPayoutUsdc = computed(() => {
    return closedPositions.value.reduce((acc, pos) => acc + (pos.settledPayoutUsdc || 0), 0);
  });

  const totalInvestedClosedUsdc = computed(() => {
    return closedPositions.value.reduce((acc, pos) => acc + (pos.totalInvestedUsdc || 0), 0);
  });

  const winsCount = computed(() => {
    return closedPositions.value.filter((p) => p.closeReason === "RESOLVED_WIN").length;
  });

  const lossesCount = computed(() => {
    return closedPositions.value.filter((p) => p.closeReason === "RESOLVED_LOSS").length;
  });

  const winRatePercent = computed(() => {
    if (closedPositions.value.length === 0) return 0;
    return (winsCount.value / closedPositions.value.length) * 100;
  });

  const roiClosedPercent = computed(() => {
    if (totalInvestedClosedUsdc.value === 0) return 0;
    return (
      ((totalSettledPayoutUsdc.value - totalInvestedClosedUsdc.value) /
        totalInvestedClosedUsdc.value) *
      100
    );
  });

  const topWinningPositions = computed(() => {
    return [...closedPositions.value]
      .filter((p) => (p.realizedPnlUsdc ?? 0) > 0)
      .sort((a, b) => (b.realizedPnlUsdc ?? 0) - (a.realizedPnlUsdc ?? 0));
  });

  async function fetchPositions(): Promise<void> {
    isLoading.value = true;
    try {
      positions.value = await api.getPositions();
    } catch (err: unknown) {
      console.warn("[PositionsStore] Erreur chargement positions ouvertes:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchClosedPositions(): Promise<void> {
    try {
      closedPositions.value = await api.getClosedPositions();
    } catch (err: unknown) {
      console.warn("[PositionsStore] Erreur chargement positions fermées:", err);
    }
  }

  async function triggerSettlement(): Promise<{ settledCount: number; message: string }> {
    isSettling.value = true;
    try {
      const res = await api.settlePositions();
      await Promise.all([fetchPositions(), fetchClosedPositions()]);
      return res;
    } catch (err: unknown) {
      console.warn("[PositionsStore] Erreur lors de l'encaissement automatique:", err);
      return { settledCount: 0, message: "Échec de vérification des marchés" };
    } finally {
      isSettling.value = false;
    }
  }

  function handlePositionUpdated(updated: OpenPosition): void {
    if (updated.status === "CLOSED" || updated.totalShares <= 0) {
      handlePositionClosed(updated.conditionId, updated);
      return;
    }

    const index = positions.value.findIndex((p) => p.conditionId === updated.conditionId);
    if (index !== -1) {
      positions.value[index] = updated;
    } else {
      positions.value.unshift(updated);
    }
  }

  function handlePositionClosed(conditionId: string, closedPos?: OpenPosition): void {
    positions.value = positions.value.filter((p) => p.conditionId !== conditionId);
    if (closedPos) {
      const existingIdx = closedPositions.value.findIndex((p) => p.conditionId === conditionId);
      if (existingIdx !== -1) {
        closedPositions.value[existingIdx] = closedPos;
      } else {
        closedPositions.value.unshift(closedPos);
      }
    } else {
      fetchClosedPositions();
    }
  }

  return {
    positions,
    closedPositions,
    isLoading,
    isSettling,
    totalUnrealizedPnlUsdc,
    totalPositionsValueUsdc,
    totalInvestedUsdc,
    totalPayoutPotentialUsdc,
    totalRealizedPnlUsdc,
    totalSettledPayoutUsdc,
    fetchPositions,
    fetchClosedPositions,
    triggerSettlement,
    handlePositionUpdated,
    handlePositionClosed,
  };
});
