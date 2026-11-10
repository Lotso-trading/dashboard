<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";

const tradesStore = useTradesStore();
const targetsStore = useTargetsStore();
const activeFilter = ref<string>("ALL");
const scrollContainer = ref<HTMLElement | null>(null);

function getWhaleName(address: string): string {
  const target = targetsStore.targets.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
  return target ? target.alias : `${address.slice(0, 8)}...`;
}

function getSideBadge(side: string, status: string) {
  if (status === "REJECTED") {
    return { label: "REJETÉ", class: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }
  if (side === "BUY") {
    return { label: "ACHAT", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  }
  return { label: "VENTE (SORTIE ALL)", class: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function setFilter(filter: string) {
  activeFilter.value = filter;
  await tradesStore.loadInitialTrades(filter);
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0;
  }
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (!target) return;
  const threshold = 100;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
    tradesStore.loadMoreTrades();
  }
}

onMounted(async () => {
  await tradesStore.loadInitialTrades("ALL");
});
</script>

<template>
  <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>⚡</span> Journal d'Activité Furtif (Lotso)
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Flux temps réel des signaux captés, réplications exécutées et filtrages anti-détection
        </p>
      </div>

      <!-- Filtres -->
      <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0E14] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <button
          type="button"
          @click="setFilter('ALL')"
          :class="[
            'px-2.5 py-1 rounded-lg font-medium transition cursor-pointer',
            activeFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Tous <span v-if="activeFilter === 'ALL'" class="text-[10px] text-slate-400">({{ tradesStore.total }})</span>
        </button>
        <button
          type="button"
          @click="setFilter('FILLED')"
          :class="[
            'px-2.5 py-1 rounded-lg font-medium transition cursor-pointer',
            activeFilter === 'FILLED'
              ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Exécutés <span v-if="activeFilter === 'FILLED'" class="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">({{ tradesStore.total }})</span>
        </button>
        <button
          type="button"
          @click="setFilter('REJECTED')"
          :class="[
            'px-2.5 py-1 rounded-lg font-medium transition cursor-pointer',
            activeFilter === 'REJECTED'
              ? 'bg-white text-amber-600 shadow-xs dark:bg-slate-800 dark:text-amber-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Rejetés <span v-if="activeFilter === 'REJECTED'" class="text-[10px] text-amber-600/80 dark:text-amber-400/80">({{ tradesStore.total }})</span>
        </button>
      </div>
    </div>

    <!-- Feed List avec Scroll Infini -->
    <div
      ref="scrollContainer"
      @scroll="handleScroll"
      class="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-[500px] overflow-y-auto"
    >
      <div
        v-for="trade in tradesStore.trades"
        :key="trade.id"
        class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition flex items-start justify-between gap-4"
      >
        <div class="flex items-start gap-3">
          <!-- Heure -->
          <span class="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-1">
            {{ formatDate(trade.executedAt) }}
          </span>

          <!-- Badge Side -->
          <span
            :class="[
              'px-2 py-0.5 rounded text-[11px] font-bold font-mono border uppercase tracking-wider',
              getSideBadge(trade.side, trade.status).class
            ]"
          >
            {{ getSideBadge(trade.side, trade.status).label }}
          </span>

          <div>
            <div class="text-xs text-slate-700 dark:text-slate-200">
              <span class="font-semibold text-slate-900 dark:text-white">Baleine</span>
              <span class="font-mono text-blue-600 dark:text-blue-400 text-[11px] ml-1.5 font-bold">{{ getWhaleName(trade.targetAddress) }}</span>
              <span class="text-slate-400 mx-1.5">•</span>
              <span class="font-mono text-slate-600 dark:text-slate-300">{{ trade.shares.toFixed(1) }} parts</span>
              <span class="text-slate-400 mx-1.5">@</span>
              <span class="font-mono text-slate-900 dark:text-slate-100 font-semibold">${{ trade.executedPrice.toFixed(3) }}</span>
              <span class="text-slate-400 text-[11px] ml-1">(${{ trade.costUsdc.toFixed(2) }} USDC)</span>
            </div>

            <!-- Motif en cas de rejet -->
            <div v-if="trade.rejectionReason" class="text-xs font-mono text-amber-600 dark:text-amber-400 mt-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md inline-block">
              🛡️ Motif du refus : {{ trade.rejectionReason }}
            </div>

            <div v-if="trade.status === 'FILLED' && trade.slippagePercent > 0" class="text-[11px] font-mono text-slate-400 mt-0.5">
              Slippage : +{{ trade.slippagePercent.toFixed(2) }}%
            </div>
          </div>
        </div>

        <!-- Mode Badge -->
        <span
          :class="[
            'text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0',
            trade.isDryRun
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          ]"
        >
          {{ trade.isDryRun ? 'Simulation' : 'Réel CLOB' }}
        </span>
      </div>

      <!-- Spinner Chargement Infini -->
      <div v-if="tradesStore.isLoadingMore" class="py-3 text-center text-xs font-mono text-blue-500 bg-slate-50 dark:bg-slate-900/40">
        Chargement des transactions précédentes...
      </div>

      <!-- Indicateur Fin de Liste -->
      <div
        v-if="!tradesStore.hasMore && tradesStore.trades.length > 0"
        class="py-3 text-center text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900/20"
      >
        ✓ Toutes les {{ tradesStore.total }} transactions ont été chargées
      </div>

      <!-- Empty State -->
      <div v-if="tradesStore.trades.length === 0 && !tradesStore.isLoading" class="text-center py-12 text-slate-400 text-xs">
        <p class="font-medium text-slate-600 dark:text-slate-300">Aucune activité détectée sous les radars pour l'instant</p>
        <p class="text-slate-400 dark:text-slate-500 mt-1">Lotso surveille les portefeuilles cibles en tâche de fond.</p>
      </div>
    </div>
  </div>
</template>
