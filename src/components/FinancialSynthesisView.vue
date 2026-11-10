<script setup lang="ts">
import { computed, ref } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";

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
  return metricsStore.metrics.initialCapitalUsdc ?? 100.0;
});
const lastSyncTime = ref(
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
);
const filterStatus = ref<"ALL" | "WIN" | "LOSS">("ALL");

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

const overallRoiPercent = computed(() => {
  if (initialCapitalUsdc.value <= 0) return 0;
  return (
    ((totalPortfolioValueUsdc.value - initialCapitalUsdc.value) / initialCapitalUsdc.value) * 100
  );
});

const maxPotentialNetProfit = computed(() => {
  return Math.max(0, positionsStore.totalPayoutPotentialUsdc - positionsStore.totalInvestedUsdc);
});

const filteredClosedPositions = computed(() => {
  if (filterStatus.value === "WIN") {
    return positionsStore.closedPositions.filter((p) => p.closeReason === "RESOLVED_WIN");
  }
  if (filterStatus.value === "LOSS") {
    return positionsStore.closedPositions.filter((p) => p.closeReason === "RESOLVED_LOSS");
  }
  return positionsStore.closedPositions;
});

const filteredTotals = computed(() => {
  const list = filteredClosedPositions.value;
  const count = list.length;
  const totalInvested = list.reduce((acc, p) => acc + (p.totalInvestedUsdc || 0), 0);
  const totalPayout = list.reduce((acc, p) => acc + (p.settledPayoutUsdc || 0), 0);
  const totalGains = list
    .filter((p) => (p.realizedPnlUsdc ?? 0) > 0)
    .reduce((acc, p) => acc + (p.realizedPnlUsdc ?? 0), 0);
  const totalLosses = list
    .filter((p) => (p.realizedPnlUsdc ?? 0) < 0)
    .reduce((acc, p) => acc + Math.abs(p.realizedPnlUsdc ?? 0), 0);
  const netPnl = list.reduce((acc, p) => acc + (p.realizedPnlUsdc ?? 0), 0);
  const totalShares = list.reduce((acc, p) => acc + (p.totalShares || 0), 0);
  const avgEntryPrice = totalShares > 0 ? totalInvested / totalShares : 0;
  const winCount = list.filter((p) => p.closeReason === "RESOLVED_WIN").length;
  const lossCount = list.filter((p) => p.closeReason === "RESOLVED_LOSS").length;
  const winRate = count > 0 ? (winCount / count) * 100 : 0;
  const roiPercent = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;

  return {
    count,
    totalInvested,
    totalPayout,
    totalGains,
    totalLosses,
    netPnl,
    totalShares,
    avgEntryPrice,
    winCount,
    lossCount,
    winRate,
    roiPercent,
  };
});

async function refreshData(): Promise<void> {
  await positionsStore.triggerSettlement();
  await metricsStore.fetchMetrics();
  lastSyncTime.value = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="space-y-8 animate-fadeIn">
    <!-- Header Synthèse & Live Status -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">💎</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            Bilan Financier & Synthèse Temps Direct
          </h2>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span class="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            LIVE DB
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Grand livre comptable automatisé, résolutions d'oracles Polymarket CLOB et valorisation instantanée • Mis à jour à {{ lastSyncTime }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="refreshData"
          :disabled="positionsStore.isSettling"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span :class="{ 'animate-spin': positionsStore.isSettling }">🔄</span>
          {{ positionsStore.isSettling ? 'Vérification...' : 'Actualiser & Encaisser' }}
        </button>
      </div>
    </div>

    <!-- 1. Le Grand Livre Financier (Base 1 000 $ initial) -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
          <span>🏛️</span> Grand Livre du Portefeuille (Base 1 000,00 $ Initial)
        </h3>
        <span class="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          ROI Global : {{ overallRoiPercent >= 0 ? '+' : '' }}{{ overallRoiPercent.toFixed(1) }} %
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 1. Cash Disponible Immédiat -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-emerald-500/40 transition-all">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Cash Disponible Immédiat</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              LIBRE
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            ${{ availableCashUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Solde disponible pour répliquer de nouveaux signaux de baleines.
          </p>
          <div class="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              class="bg-emerald-500 h-full rounded-full transition-all duration-500"
              :style="{ width: `${Math.min(100, (availableCashUsdc / totalPortfolioValueUsdc) * 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- 2. Capital Engagé (Positions Ouvertes) -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-blue-500/40 transition-all">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Capital Engagé (Positions Ouvertes)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
              {{ positionsStore.positions.length }} MARCHÉS
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ positionsStore.totalInvestedUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Mises actuellement en jeu sur des événements non encore résolus.
          </p>
          <div class="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              class="bg-blue-500 h-full rounded-full transition-all duration-500"
              :style="{ width: `${Math.min(100, (positionsStore.totalInvestedUsdc / totalPortfolioValueUsdc) * 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- 3. Valeur Immédiate au Carnet -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-sky-500/40 transition-all">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Valeur Immédiate au Carnet</span>
            <span
              class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
              :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
            >
              {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }} PnL
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-sky-600 dark:text-sky-400 tracking-tight">
            ${{ positionsStore.totalPositionsValueUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Somme récupérée si vous revendez toutes vos parts au carnet dès maintenant.
          </p>
          <div class="mt-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Plus-value latente : <strong class="text-emerald-600 dark:text-emerald-400">+{{ ((positionsStore.totalUnrealizedPnlUsdc / Math.max(1, positionsStore.totalInvestedUsdc)) * 100).toFixed(1) }}%</strong>
          </div>
        </div>

        <!-- 4. Payout Garanti Max (si Victoire) -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-amber-500/40 transition-all">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Payout Garanti Max (si Victoire)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
              1,00 $ / PART
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            ${{ positionsStore.totalPayoutPotentialUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Rachat garanti par Polymarket si tous les paris en cours se réalisent.
          </p>
          <div class="mt-3 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Gain net potentiel max : +${{ maxPotentialNetProfit.toFixed(2) }} USDC
          </div>
        </div>

        <!-- 5. Bénéfice Net Réalisé Encaissé -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-emerald-500/40 transition-all">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span class="font-medium">Bénéfice Net Réalisé (Encaissé)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              SÉCURISÉ
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            +${{ positionsStore.totalRealizedPnlUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Bénéfice net définitivement racheté par Polymarket suite aux résolutions.
          </p>
          <div class="mt-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Total Payouts rachetés : <strong class="text-slate-900 dark:text-white">${{ positionsStore.totalSettledPayoutUsdc.toFixed(2) }}</strong>
          </div>
        </div>

        <!-- 6. VALEUR TOTALE DU PORTEFEUILLE -->
        <div class="bg-gradient-to-br from-blue-500/5 via-white to-emerald-500/5 dark:from-blue-900/20 dark:via-slate-900/80 dark:to-emerald-900/20 backdrop-blur border-2 border-blue-500/40 dark:border-blue-500/50 rounded-2xl p-5 shadow-md hover:border-blue-500 transition-all">
          <div class="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">
            <span>VALEUR TOTALE PORTEFEUILLE</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono font-bold">
              {{ overallRoiPercent >= 0 ? '+' : '' }}{{ overallRoiPercent.toFixed(1) }} %
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ totalPortfolioValueUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-2">
            Cash disponible (${{ availableCashUsdc.toFixed(2) }}) + Valorisation carnet (${{ positionsStore.totalPositionsValueUsdc.toFixed(2) }}).
          </p>
          <div class="mt-3 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            Gain net total : +${{ (totalPortfolioValueUsdc - initialCapitalUsdc).toFixed(2) }} USDC
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Scoreboard des Clôtures & Résolutions (19 marchés) -->
    <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-6 shadow-xs transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏆</span> Bilan des {{ positionsStore.closedPositions.length }} Marchés Clôturés & Résolus
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Validation par oracle officiel Polymarket CLOB • Payout à 1,00 $ USDC pour chaque part gagnante
          </p>
        </div>

        <div class="flex items-center gap-4 text-xs font-mono">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span class="text-slate-700 dark:text-slate-300 font-semibold">{{ positionsStore.winsCount }} Victoires ({{ positionsStore.winRatePercent.toFixed(1) }}%)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-rose-500"></span>
            <span class="text-slate-500 dark:text-slate-400">{{ positionsStore.lossesCount }} Défaites</span>
          </div>
        </div>
      </div>

      <!-- Barre de Répartition Victoires / Défaites -->
      <div class="mt-5 space-y-2">
        <div class="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>Taux de Réussite : <strong class="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{{ positionsStore.winRatePercent.toFixed(1) }} %</strong></span>
          <span>ROI Réalisé : <strong class="text-emerald-600 dark:text-emerald-400 font-bold text-sm">+{{ positionsStore.roiClosedPercent.toFixed(1) }} %</strong></span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
          <div
            class="bg-emerald-500 h-full transition-all duration-500"
            :style="{ width: `${positionsStore.winRatePercent}%` }"
            title="Victoires"
          ></div>
          <div
            class="bg-rose-500 h-full transition-all duration-500"
            :style="{ width: `${100 - positionsStore.winRatePercent}%` }"
            title="Défaites"
          ></div>
        </div>
      </div>

      <!-- Scoreboard Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Mises Engagées</span>
          <span class="text-base font-bold font-mono text-slate-900 dark:text-white">
            ${{ positionsStore.totalInvestedClosedUsdc.toFixed(2) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Total Racheté (Payout)</span>
          <span class="text-base font-bold font-mono text-slate-900 dark:text-white">
            ${{ positionsStore.totalSettledPayoutUsdc.toFixed(2) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Bénéfice Net Réalisé</span>
          <span class="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +${{ positionsStore.totalRealizedPnlUsdc.toFixed(2) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Rendement sur les Clôtures</span>
          <span class="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +{{ positionsStore.roiClosedPercent.toFixed(1) }} %
          </span>
        </div>
      </div>
    </div>

    <!-- 4. Liste Complète des 19 Marchés Résolus (Table Minimaliste) -->
    <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl overflow-hidden shadow-xs transition-colors">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">
            Journal Exhaustif des {{ positionsStore.closedPositions.length }} Positions Clôturées
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Détail des montants investis, cotes d'exécution et profits réalisés
          </p>
        </div>

        <!-- Filtres Win / Loss -->
        <div class="inline-flex items-center p-0.5 rounded-lg border bg-slate-100 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 text-xs">
          <button
            type="button"
            @click="filterStatus = 'ALL'"
            :class="[
              'px-3 py-1 rounded-md transition font-medium cursor-pointer',
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Tous ({{ positionsStore.closedPositions.length }})
          </button>
          <button
            type="button"
            @click="filterStatus = 'WIN'"
            :class="[
              'px-3 py-1 rounded-md transition font-medium cursor-pointer',
              filterStatus === 'WIN'
                ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Victoires ({{ positionsStore.winsCount }})
          </button>
          <button
            type="button"
            @click="filterStatus = 'LOSS'"
            :class="[
              'px-3 py-1 rounded-md transition font-medium cursor-pointer',
              filterStatus === 'LOSS'
                ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Défaites ({{ positionsStore.lossesCount }})
          </button>
        </div>
      </div>

      <!-- Bandeau Synthèse des Marchés (Gains, Pertes, Payout Reçu, Bilan Net) -->
      <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- 1. Payout Reçu -->
          <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 shadow-2xs">
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-medium flex items-center gap-1.5">
                <span>💰</span> Payout Reçu
              </span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                ENCAISSÉ
              </span>
            </div>
            <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              ${{ filteredTotals.totalPayout.toFixed(2) }}
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Montant brut racheté par Polymarket
            </p>
          </div>

          <!-- 2. Total Gains (Victoires) -->
          <div class="bg-white dark:bg-slate-900/80 border border-emerald-500/20 dark:border-emerald-500/20 rounded-xl p-3 shadow-2xs">
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-medium flex items-center gap-1.5">
                <span>🟢</span> Gains Cumulés
              </span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                +{{ filteredTotals.winCount }} WINS
              </span>
            </div>
            <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              +${{ filteredTotals.totalGains.toFixed(2) }}
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Profits nets des paris victorieux
            </p>
          </div>

          <!-- 3. Total Pertes (Défaites) -->
          <div class="bg-white dark:bg-slate-900/80 border border-rose-500/20 dark:border-rose-500/20 rounded-xl p-3 shadow-2xs">
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-medium flex items-center gap-1.5">
                <span>🔴</span> Pertes Cumulées
              </span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold">
                -{{ filteredTotals.lossCount }} LOSS
              </span>
            </div>
            <div class="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              -${{ filteredTotals.totalLosses.toFixed(2) }}
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Mises perdues sur résolutions contraires
            </p>
          </div>

          <!-- 4. Résultat Net (PnL) -->
          <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 shadow-2xs">
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-medium flex items-center gap-1.5">
                <span>⚖️</span> Bilan Net (PnL)
              </span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                :class="filteredTotals.netPnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
              >
                {{ filteredTotals.roiPercent >= 0 ? '+' : '' }}{{ filteredTotals.roiPercent.toFixed(1) }} %
              </span>
            </div>
            <div
              class="text-xl font-bold font-mono tracking-tight"
              :class="filteredTotals.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ filteredTotals.netPnl >= 0 ? '+' : '' }}${{ filteredTotals.netPnl.toFixed(2) }}
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Sur ${{ filteredTotals.totalInvested.toFixed(2) }} misés ({{ filteredTotals.count }} marchés)
            </p>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3 px-6">Marché / Événement</th>
              <th class="py-3 px-4">Issue</th>
              <th class="py-3 px-4">Parts</th>
              <th class="py-3 px-4">Mise Engagée</th>
              <th class="py-3 px-4">Prix Moyen</th>
              <th class="py-3 px-4">Payout Reçu</th>
              <th class="py-3 px-4">Gain Net (PnL)</th>
              <th class="py-3 px-6 text-right">Résultat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
            <tr
              v-for="pos in filteredClosedPositions"
              :key="pos.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
            >
              <td class="py-3.5 px-6 font-sans">
                <a
                  :href="`https://polymarket.com/event/${pos.marketSlug}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 flex items-center gap-1.5"
                >
                  {{ pos.marketQuestion }}
                  <span class="text-[10px] text-slate-400">↗</span>
                </a>
                <span class="text-[11px] text-slate-400 font-sans block mt-0.5">
                  Clôturé le {{ formatDate(pos.closedAt) }}
                </span>
              </td>

              <td class="py-3.5 px-4 font-sans">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {{ pos.outcomeLabel }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-slate-900 dark:text-white">
                {{ pos.totalShares.toFixed(2) }}
              </td>

              <td class="py-3.5 px-4">
                ${{ (pos.totalInvestedUsdc || 0).toFixed(2) }}
              </td>

              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                ${{ (pos.avgEntryPrice || 0).toFixed(3) }}
              </td>

              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                ${{ (pos.settledPayoutUsdc || 0).toFixed(2) }}
              </td>

              <td
                class="py-3.5 px-4 font-bold"
                :class="(pos.realizedPnlUsdc ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
                {{ (pos.realizedPnlUsdc ?? 0) >= 0 ? '+' : '' }}${{ (pos.realizedPnlUsdc ?? 0).toFixed(2) }}
              </td>

              <td class="py-3.5 px-6 text-right font-sans">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  :class="pos.closeReason === 'RESOLVED_WIN'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'"
                >
                  {{ pos.closeReason === 'RESOLVED_WIN' ? '🏆 VICTOIRE' : '❌ DÉFAITE' }}
                </span>
              </td>
            </tr>

            <tr v-if="filteredClosedPositions.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400 text-xs font-sans">
                <div class="text-2xl mb-2">🏁</div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Aucune position clôturée pour ce filtre</p>
                <p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                  Sélectionnez un autre filtre ou patientez que les oracles résolvent les marchés en cours.
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Ligne de Totalisation Comptable (tfoot) -->
          <tfoot
            v-if="filteredClosedPositions.length > 0"
            class="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/80 font-mono text-xs font-bold text-slate-900 dark:text-white"
          >
            <tr>
              <td class="py-3.5 px-6 font-sans">
                <div class="flex items-center gap-2">
                  <span>📊 TOTAL SYNTHÈSE</span>
                  <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                    ({{ filteredTotals.count }} marché{{ filteredTotals.count > 1 ? 's' : '' }})
                  </span>
                </div>
              </td>
              <td class="py-3.5 px-4 font-sans text-slate-400">—</td>
              <td class="py-3.5 px-4">{{ filteredTotals.totalShares.toFixed(2) }}</td>
              <td class="py-3.5 px-4">${{ filteredTotals.totalInvested.toFixed(2) }}</td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                ${{ filteredTotals.avgEntryPrice.toFixed(3) }}
              </td>
              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                ${{ filteredTotals.totalPayout.toFixed(2) }}
              </td>
              <td
                class="py-3.5 px-4 font-bold"
                :class="filteredTotals.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
                {{ filteredTotals.netPnl >= 0 ? '+' : '' }}${{ filteredTotals.netPnl.toFixed(2) }}
              </td>
              <td class="py-3.5 px-6 text-right font-sans">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  :class="filteredTotals.winRate >= 50
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'"
                >
                  {{ filteredTotals.winRate.toFixed(1) }}% Victoires
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
