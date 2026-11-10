import type { RiskConfig, UpdateRiskConfigInput } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";

export const useConfigStore = defineStore("config", () => {
  const config = ref<RiskConfig & { isBotRunning: boolean }>({
    balancePercentPerTrade: 0.03,
    maxSlippagePercent: 2.0,
    maxCapPerTradeUsdc: 50.0,
    maxExposurePerMarketUsdc: 150.0,
    maxExposurePerTargetUsdc: 300.0,
    minCashReserveUsdc: 5.0,
    minPrice: 0.05,
    maxPrice: 0.9,
    copySellOrders: true,
    dryRun: true,
    maxAllocatedCapitalUsdc: 0,
    profitReinvestmentPercent: 50.0,
    isBotRunning: true,
  });

  const isLoading = ref(false);

  async function fetchConfig(): Promise<void> {
    isLoading.value = true;
    try {
      config.value = await api.getConfig();
    } catch (err: unknown) {
      console.warn("[ConfigStore] Erreur chargement config:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function updateConfig(dto: UpdateRiskConfigInput): Promise<void> {
    const updated = await api.updateConfig(dto);
    config.value = updated;
  }

  function handleConfigUpdated(updated: RiskConfig & { isBotRunning: boolean }): void {
    config.value = updated;
  }

  return {
    config,
    isLoading,
    fetchConfig,
    updateConfig,
    handleConfigUpdated,
  };
});
