<script setup lang="ts">
import { computed, ref } from "vue";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";

const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();

const initialCapitalUsdc = 1000.0;
const lastSyncTime = ref(
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
);
const filterStatus = ref<"ALL" | "WIN" | "LOSS">("ALL");

const availableCashUsdc = computed(() => {
  return Math.max(
    0,
    initialCapitalUsdc - positionsStore.totalInvestedUsdc + positionsStore.totalRealizedPnlUsdc
  );
});

const totalPortfolioValueUsdc = computed(() => {
  return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
});

const overallRoiPercent = computed(() => {
  return ((totalPortfolioValueUsdc.value - initialCapitalUsdc) / initialCapitalUsdc) * 100;
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

async function refreshData(): Promise<void> {
  await Promise.all([
    metricsStore.fetchMetrics(),
    positionsStore.fetchPositions(),
    positionsStore.fetchClosedPositions(),
    positionsStore.triggerSettlement(),
  ]);
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

    <!-- 3. Vitrine Bento : Les Plus Beaux Gains Encaissés (Hall of Fame) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
          <span>⭐</span> Exemples Marquants de Gains Résolus (Top Victoires)
        </h3>
        <span class="text-xs text-slate-500 dark:text-slate-400">Classés par profit net décroissant</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 🥇 Top 1 : AS Monaco FC -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-amber-500/40 dark:border-amber-500/30 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div class="absolute -right-3 -top-3 text-4xl opacity-15">🥇</div>
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-bold text-amber-600 dark:text-amber-400 font-mono text-[11px]">TOP 1 GAIN (+284%)</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
              +70,19 $ NET
            </span>
          </div>
          <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
            Will AS Monaco FC win on 2026-11-08?
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Issue choisie : <strong>NO</strong> (94,92 parts @ 0,26 $)</p>
          
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-mono">
            <div>
              <span class="text-slate-400 block text-[10px]">Mise</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">24,73 $</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Payout Encaissé</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">94,92 $ USDC</span>
            </div>
          </div>
        </div>

        <!-- 🥈 Top 2 : Club Blooming vs Oriente -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div class="absolute -right-3 -top-3 text-4xl opacity-15">🥈</div>
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-bold text-slate-600 dark:text-slate-300 font-mono text-[11px]">TOP 2 GAIN (+100%)</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
              +29,88 $ NET
            </span>
          </div>
          <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
            Club Blooming vs. Oriente (1st Half O/U 0.5)
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Issue choisie : <strong>Under</strong> (59,88 parts @ 0,501 $)</p>
          
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-mono">
            <div>
              <span class="text-slate-400 block text-[10px]">Mise</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">30,00 $</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Payout Encaissé</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">59,88 $ USDC</span>
            </div>
          </div>
        </div>

        <!-- 🥉 Top 3 : Aarhus GF vs AC Horsens -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div class="absolute -right-3 -top-3 text-4xl opacity-15">🥉</div>
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-bold text-slate-600 dark:text-slate-300 font-mono text-[11px]">TOP 3 GAIN (+100%)</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
              +25,39 $ NET
            </span>
          </div>
          <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
            Aarhus GF vs. AC Horsens: O/U 2.5
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Issue choisie : <strong>Under</strong> (50,89 parts @ 0,501 $)</p>
          
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-mono">
            <div>
              <span class="text-slate-400 block text-[10px]">Mise</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">25,50 $</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Payout Encaissé</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">50,89 $ USDC</span>
            </div>
          </div>
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
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
