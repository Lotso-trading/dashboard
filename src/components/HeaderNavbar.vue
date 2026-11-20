<script setup lang="ts">
import { usePortfolioMetrics } from "../composables/use-portfolio-metrics.ts";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { formatCurrency, formatSignedCurrency } from "../utils/formatters.ts";
import ThemeToggle from "./ThemeToggle.vue";
import AppBadge from "./ui/AppBadge.vue";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const {
    availableCashUsdc,
    totalPortfolioValueUsdc,
    overallNetGainUsdc,
    realizedPnlUsdc,
    unrealizedPnlUsdc,
} = usePortfolioMetrics();
</script>

<template>
  <header
    class="border-b border-slate-200 dark:border-rose-950/40 bg-white/95 dark:bg-[#070A10]/95 backdrop-blur sticky top-0 z-40 px-4 py-2 transition-colors"
  >
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
      <!-- Logo Lotso Officiel & Statut -->
      <div class="flex items-center gap-2.5 shrink-0">
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
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="font-mono font-black text-sm tracking-wider text-rose-600 dark:text-rose-500">
            LOTSO
          </span>
          <AppBadge
            :variant="configStore.config?.dryRun ? 'warning' : 'success'"
            size="xs"
            rounded="md"
          >
            {{ configStore.config?.dryRun ? "DRY-RUN" : "LIVE" }}
          </AppBadge>
        </div>
      </div>

      <!-- Bandeau Télémétrie Monoligne -->
      <div
        class="hidden md:flex items-center gap-3 text-xs font-mono bg-slate-100/80 dark:bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-nowrap"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">VAL</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ formatCurrency(totalPortfolioValueUsdc) }}</span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">CASH</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(availableCashUsdc) }}</span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div
          class="flex items-center gap-1.5"
          :title="`Réalisé : ${formatSignedCurrency(realizedPnlUsdc)} · Latent : ${formatSignedCurrency(unrealizedPnlUsdc)}`"
        >
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">PNL</span>
          <span
            class="font-semibold"
            :class="
              overallNetGainUsdc >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            "
          >
            {{ formatSignedCurrency(overallNetGainUsdc) }}
          </span>
        </div>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">CIBLES</span>
          <span class="font-bold text-rose-600 dark:text-rose-400">{{ metricsStore.metrics.activeTargetsCount }}</span>
        </div>
      </div>

      <!-- Thème Toggle -->
      <div class="flex items-center gap-2 shrink-0">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
