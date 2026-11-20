<script setup lang="ts">
import { computed, ref } from "vue";
import { usePortfolioMetrics } from "../composables/use-portfolio-metrics.ts";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "../utils/formatters.ts";
import AppBadge from "./ui/AppBadge.vue";
import AppIcon from "./ui/AppIcon.vue";

const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();
const tradesStore = useTradesStore();
const last24hStore = useLast24hSummaryStore();

const isResetting = ref(false);

const {
    initialCapitalUsdc,
    availableCashUsdc,
    totalPortfolioValueUsdc,
    overallNetGainUsdc: overallGainUsdc,
    overallRoiPercent: overallGainPercent,
} = usePortfolioMetrics();

const cashPercentage = computed(() => {
    if (totalPortfolioValueUsdc.value <= 0) return 0;
    return Math.min(100, (availableCashUsdc.value / totalPortfolioValueUsdc.value) * 100);
});

const effectiveWinRate = computed(() => {
    if (last24hStore.totalsAll.count > 0) {
        return `${last24hStore.totalsAll.winRate.toFixed(1)}%`;
    }
    if (positionsStore.closedPositions.length > 0) {
        return `${positionsStore.winRatePercent.toFixed(1)}%`;
    }
    return "—";
});

async function handleResetSimulation(): Promise<void> {
    if (
        !confirm(
            `Voulez-vous réinitialiser le portefeuille de simulation à ${formatCurrency(initialCapitalUsdc.value)} et purger les positions actuelles ?`
        )
    ) {
        return;
    }
    isResetting.value = true;
    try {
        await metricsStore.resetSimulation();
        await positionsStore.fetchPositions();
        await tradesStore.fetchTrades(1, 20);
    } finally {
        isResetting.value = false;
    }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Alerte Bouclier de Sécurité -->
    <div
      v-if="availableCashUsdc <= 5.0"
      class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-start gap-3">
        <AppIcon name="shield" :size="20" class="text-amber-500 mt-0.5" />
        <div>
          <h4 class="font-bold text-amber-600 dark:text-amber-400">
            Bouclier de Sécurité Activé ({{ availableCashUsdc.toFixed(2) }} USDC restant)
          </h4>
          <p class="text-slate-600 dark:text-slate-300 mt-0.5">
            Tout nouvel ordre d'achat est suspendu tant que le cash disponible reste sous la réserve minimale.
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="handleResetSimulation"
        :disabled="isResetting"
        class="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
      >
        <AppIcon name="refresh-cw" :size="14" :class="{ 'animate-spin': isResetting }" />
        <span>
          {{ isResetting ? "Réinitialisation..." : `Réinitialiser (${formatCurrency(initialCapitalUsdc, 0)})` }}
        </span>
      </button>
    </div>

    <!-- 4 Cartes Bento -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Valeur Totale -->
      <div
        class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium truncate">Valeur Portefeuille</span>
            <AppBadge variant="info" size="xs">
              Base {{ formatCurrency(initialCapitalUsdc, 0) }}
            </AppBadge>
          </div>
          <div class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            {{ formatCurrency(totalPortfolioValueUsdc) }}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <span class="text-slate-500 dark:text-slate-400">Gain Net :</span>
          <AppBadge :variant="overallGainUsdc >= 0 ? 'success' : 'danger'" size="xs" rounded="md">
            {{ formatSignedCurrency(overallGainUsdc) }} ({{ formatSignedPercent(overallGainPercent) }})
          </AppBadge>
        </div>
      </div>

      <!-- 2. Cash Disponible -->
      <div
        class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium truncate">Cash Disponible</span>
            <AppBadge :variant="availableCashUsdc > 5 ? 'success' : 'danger'" size="xs">
              {{ availableCashUsdc > 5 ? "Prêt" : "Épuisé" }}
            </AppBadge>
          </div>
          <div
            class="text-3xl font-bold font-mono tracking-tight"
            :class="availableCashUsdc > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ formatCurrency(availableCashUsdc) }}
          </div>
        </div>

        <div class="mt-4 space-y-1.5">
          <div class="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>Trésorerie libre</span>
            <span class="font-bold text-slate-700 dark:text-slate-300">{{ cashPercentage.toFixed(0) }}%</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              class="bg-emerald-500 h-full rounded-full transition-all duration-500"
              :style="{ width: `${cashPercentage}%` }"
            />
          </div>
        </div>
      </div>

      <!-- 3. Positions en Cours -->
      <div
        class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-sky-400 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium truncate">Positions en Cours</span>
            <AppBadge variant="neutral" size="xs">
              {{ positionsStore.positions.length }} marchés
            </AppBadge>
          </div>
          <div class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            {{ formatCurrency(positionsStore.totalInvestedUsdc) }}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <span class="text-slate-500 dark:text-slate-400">PnL latent :</span>
          <AppBadge
            :variant="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'success' : 'danger'"
            size="xs"
            rounded="md"
          >
            {{ formatSignedCurrency(positionsStore.totalUnrealizedPnlUsdc) }}
          </AppBadge>
        </div>
      </div>

      <!-- 4. Efficacité & Win Rate -->
      <div
        class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-rose-400 dark:hover:border-rose-500/40 transition-all flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium truncate">Efficacité Lotso</span>
            <AppBadge variant="brand" size="xs">
              {{ metricsStore.metrics.activeTargetsCount }} cibles
            </AppBadge>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {{ effectiveWinRate }}
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">Win Rate</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[11px] font-mono">
          <span class="text-slate-500 dark:text-slate-400 truncate">
            {{ metricsStore.metrics.totalCopiedTrades }} ordres ({{ formatCurrency(metricsStore.metrics.totalTradedVolumeUsdc, 0) }})
          </span>
          <span class="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1 shrink-0">
            <AppIcon name="shield" :size="12" />
            <span>{{ metricsStore.metrics.totalRejectedTrades }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
