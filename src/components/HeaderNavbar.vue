<script setup lang="ts">
import { computed } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import ThemeToggle from "./ThemeToggle.vue";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();

const initialCapitalUsdc = computed(() => {
  if (
    configStore.config?.maxAllocatedCapitalUsdc &&
    configStore.config.maxAllocatedCapitalUsdc > 0
  ) {
    return configStore.config.maxAllocatedCapitalUsdc;
  }
  return Number(
    configStore.config?.simulatedBalanceUsdc ?? metricsStore.metrics.initialCapitalUsdc ?? 1000.0
  );
});
const availableCashUsdc = computed(() => {
  if (typeof metricsStore.metrics.availableCashUsdc === "number") {
    return metricsStore.metrics.availableCashUsdc;
  }
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
</script>

<template>
  <header class="border-b border-slate-200 dark:border-rose-950/40 bg-white/95 dark:bg-[#070A10]/95 backdrop-blur sticky top-0 z-40 px-4 py-2 transition-colors">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
      <!-- Logo Lotso Officiel & Statut -->
      <div class="flex items-center gap-2.5">
        <div class="relative shrink-0 flex items-center">
          <img
            src="/lotso-avatar.jpg"
            alt="Lotso"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-rose-500 shadow-xs ring-1 ring-rose-400/30 shrink-0 select-none"
          />
          <span
            class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-[#070A10]"
            :class="
              !configStore.config?.isBotOnline
                ? 'bg-slate-400'
                : configStore.config?.isBotRunning
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-rose-500'
            "
          ></span>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="font-mono font-black text-sm tracking-wider text-slate-900 dark:text-white flex items-center gap-1">
            <span class="text-rose-600 dark:text-rose-500">LOTSO</span>
          </span>
          <span
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight border',
              configStore.config?.dryRun
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            ]"
          >
            {{ configStore.config?.dryRun ? '[DRY-RUN]' : '[LIVE]' }}
          </span>
        </div>
      </div>

      <!-- Quick Metrics Bar (Bandeau Télémétrie Monoligne Haute Densité) -->
      <div class="hidden md:flex items-center gap-3 text-xs font-mono bg-slate-100/80 dark:bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">VAL</span>
          <span class="font-bold text-slate-900 dark:text-white">${{ totalPortfolioValueUsdc.toFixed(2) }}</span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">CASH</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">${{ availableCashUsdc.toFixed(2) }}</span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">PNL</span>
          <span
            class="font-semibold"
            :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }}
          </span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">CIBLES</span>
          <span class="font-bold text-rose-600 dark:text-rose-400">{{ metricsStore.metrics.activeTargetsCount }}</span>
        </div>
      </div>

      <!-- Thème Toggle -->
      <div class="flex items-center gap-2 sm:gap-2.5">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
