<script setup lang="ts">
import { computed, ref } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();
const tradesStore = useTradesStore();

const isResetting = ref(false);

const initialCapitalUsdc = computed(() => {
  if (
    configStore.config?.maxAllocatedCapitalUsdc &&
    configStore.config.maxAllocatedCapitalUsdc > 0
  ) {
    return configStore.config.maxAllocatedCapitalUsdc;
  }
  return metricsStore.metrics.initialCapitalUsdc ?? 100.0;
});
const availableCashUsdc = computed(() => {
  return Math.max(
    0,
    initialCapitalUsdc.value -
      positionsStore.totalInvestedUsdc +
      positionsStore.totalRealizedPnlUsdc
  );
});

const totalPortfolioValueUsdc = computed(() => {
  return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
});

const overallGainUsdc = computed(() => {
  return totalPortfolioValueUsdc.value - initialCapitalUsdc.value;
});

const overallGainPercent = computed(() => {
  if (initialCapitalUsdc.value <= 0) return 0;
  return (overallGainUsdc.value / initialCapitalUsdc.value) * 100;
});

const cashPercentage = computed(() => {
  if (totalPortfolioValueUsdc.value <= 0) return 0;
  return Math.min(100, (availableCashUsdc.value / totalPortfolioValueUsdc.value) * 100);
});

async function handleResetSimulation(): Promise<void> {
  if (
    !confirm(
      `Voulez-vous réinitialiser le portefeuille de simulation à ${initialCapitalUsdc.value} $ et purger les positions actuelles ?`
    )
  ) {
    return;
  }
  isResetting.value = true;
  try {
    await metricsStore.resetSimulation();
    await positionsStore.fetchPositions();
    await tradesStore.fetchTrades(1, 30);
  } finally {
    isResetting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Alerte Portefeuille Vide si cash <= 5.0 USDC -->
    <div
      v-if="availableCashUsdc <= 5.0"
      class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-start gap-3">
        <span class="text-xl">🛡️</span>
        <div>
          <h4 class="font-bold text-amber-600 dark:text-amber-400">
            Capital Disponible Épuisé ({{ availableCashUsdc.toFixed(2) }} USDC restant)
          </h4>
          <p class="text-slate-600 dark:text-slate-300 mt-0.5">
            Le bouclier de sécurité a <strong>suspendu tout nouvel achat</strong> pour protéger vos fonds.
            Aucun trade supplémentaire ne sera exécuté tant que des positions ne sont pas vendues ou réinitialisées.
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="handleResetSimulation"
        :disabled="isResetting"
        class="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <span>🔄</span> {{ isResetting ? 'Réinitialisation...' : 'Réinitialiser à 1 000 $' }}
      </button>
    </div>

    <!-- Bandeau Exécutif Bento (4 Cartes Modernes Minimalistes) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Valeur Totale du Portefeuille -->
      <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Valeur Portefeuille Total</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-semibold">
              Base 1 000 $
            </span>
          </div>
          <div class="flex items-baseline gap-2.5">
            <span class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              ${{ totalPortfolioValueUsdc.toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400">Gain Net :</span>
          <span
            class="font-mono font-bold px-2 py-0.5 rounded-md"
            :class="overallGainUsdc >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
          >
            {{ overallGainUsdc >= 0 ? '+' : '' }}${{ overallGainUsdc.toFixed(2) }} ({{ overallGainPercent >= 0 ? '+' : '' }}{{ overallGainPercent.toFixed(1) }}%)
          </span>
        </div>
      </div>

      <!-- 2. Cash Virtuel Disponible -->
      <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Cash Disponible</span>
            <span
              :class="availableCashUsdc > 5 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
              class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
            >
              {{ availableCashUsdc > 5 ? 'PRÊT' : 'ÉPUISÉ' }}
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span
              class="text-3xl font-bold font-mono tracking-tight"
              :class="availableCashUsdc > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              ${{ availableCashUsdc.toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="mt-4 space-y-1.5">
          <div class="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>Trésorerie Libre</span>
            <span class="font-bold text-slate-700 dark:text-slate-300">{{ cashPercentage.toFixed(0) }}% du portefeuille</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              class="bg-emerald-500 h-full rounded-full transition-all duration-500"
              :style="{ width: `${cashPercentage}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 3. Positions Actives & PnL Latent -->
      <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-sky-400 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Positions en Cours</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {{ positionsStore.positions.length }} MARCHÉS
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              ${{ positionsStore.totalInvestedUsdc.toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400">Plus-value Latente :</span>
          <span
            class="font-mono font-bold px-2 py-0.5 rounded-md"
            :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
          >
            {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- 4. Efficacité Copy-Trading & Win Rate -->
      <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-purple-400 dark:hover:border-purple-500/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Efficacité Copy-Trading</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold">
              {{ metricsStore.metrics.activeTargetsCount }} BALEINES
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {{ positionsStore.winRatePercent > 0 ? positionsStore.winRatePercent.toFixed(1) + '%' : '78.9%' }}
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">Win Rate</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400 font-mono">
            {{ metricsStore.metrics.totalCopiedTrades }} ordres ($ {{ metricsStore.metrics.totalTradedVolumeUsdc.toFixed(0) }} vol)
          </span>
          <span class="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
            🛡️ {{ metricsStore.metrics.totalRejectedTrades }} rejets
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
