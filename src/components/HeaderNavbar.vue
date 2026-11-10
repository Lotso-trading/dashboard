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
  if (configStore.config?.maxAllocatedCapitalUsdc && configStore.config.maxAllocatedCapitalUsdc > 0) {
    return configStore.config.maxAllocatedCapitalUsdc;
  }
  return metricsStore.metrics.initialCapitalUsdc ?? 100.0;
});
const availableCashUsdc = computed(() => {
  return Math.max(
    0,
    initialCapitalUsdc.value - positionsStore.totalInvestedUsdc + positionsStore.totalRealizedPnlUsdc
  );
});
const totalPortfolioValueUsdc = computed(() => {
  return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
});

async function toggleBot(): Promise<void> {
  const current = configStore.config?.isBotRunning ?? true;
  await configStore.updateConfig({
    // @ts-expect-error isBotRunning supported by API
    isBotRunning: !current,
  });
}
</script>

<template>
  <header class="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-[#0B0E14]/90 backdrop-blur sticky top-0 z-40 px-6 py-3.5 transition-colors">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <!-- Logo et Statut -->
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-blue-600/10 border border-blue-500/30 dark:bg-blue-600/20 dark:border-blue-500/40 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 font-mono">
          PM
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-base tracking-tight text-slate-900 dark:text-white font-mono">Polymarket Copy-Trading</span>
            <span
              :class="[
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                configStore.config?.dryRun
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              ]"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="configStore.config?.dryRun ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'"></span>
              {{ configStore.config?.dryRun ? 'SIMULATION DRY-RUN' : 'LIVE RÉEL' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Terminal Financier & Moteur de Réplication</p>
        </div>
      </div>

      <!-- Quick Metrics Bar -->
      <div class="hidden md:flex items-center gap-6 text-sm">
        <div class="flex flex-col">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Portefeuille ({{ initialCapitalUsdc }} $)</span>
          <span class="font-mono font-bold text-slate-900 dark:text-white">
            ${{ totalPortfolioValueUsdc.toFixed(2) }}
          </span>
        </div>

        <div class="flex flex-col">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cash Dispo</span>
          <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            ${{ availableCashUsdc.toFixed(2) }}
          </span>
        </div>

        <div class="flex flex-col">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">PnL Latent</span>
          <span
            class="font-mono font-semibold"
            :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }}
          </span>
        </div>

        <div class="flex flex-col">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Baleines</span>
          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {{ metricsStore.metrics.activeTargetsCount }} suivies
          </span>
        </div>
      </div>

      <!-- Action Bouton Statut & Thème -->
      <div class="flex items-center gap-3">
        <!-- Switcher de Thème Apple (Clair / Sombre / Auto) -->
        <ThemeToggle />

        <button
          type="button"
          @click="toggleBot"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 border cursor-pointer',
            configStore.config?.isBotRunning
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
          ]"
        >
          <span
            class="h-2 w-2 rounded-full animate-pulse"
            :class="configStore.config?.isBotRunning ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'"
          ></span>
          {{ configStore.config?.isBotRunning ? 'BOT ACTIF' : 'BOT EN PAUSE' }}
        </button>
      </div>
    </div>
  </header>
</template>
