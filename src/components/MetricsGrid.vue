<script setup lang="ts">
import { computed, ref } from "vue";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";

const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();
const tradesStore = useTradesStore();

const isResetting = ref(false);

const initialCapitalUsdc = 1000.0;
const availableCashUsdc = computed(() => {
  return Math.max(
    0,
    initialCapitalUsdc - positionsStore.totalInvestedUsdc + positionsStore.totalRealizedPnlUsdc
  );
});
const totalPortfolioValueUsdc = computed(() => {
  return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
});

async function handleResetSimulation() {
  if (
    !confirm(
      "Voulez-vous réinitialiser le portefeuille de simulation à 1 000 $ et purger les positions actuelles ?"
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
      class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-start gap-3">
        <span class="text-xl">🛡️</span>
        <div>
          <h4 class="font-bold text-amber-400">
            Capital Disponible Épuisé ({{ availableCashUsdc.toFixed(2) }} USDC restant)
          </h4>
          <p class="text-slate-300 mt-0.5">
            Le bouclier de sécurité a <strong>strictement suspendu tout nouvel achat</strong> pour protéger vos fonds.
            Aucun trade supplémentaire ne sera exécuté tant que des positions ne sont pas vendues ou réinitialisées.
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="handleResetSimulation"
        :disabled="isResetting"
        class="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-lg transition text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
      >
        <span>🔄</span> {{ isResetting ? 'Réinitialisation...' : 'Réinitialiser à 1 000 $' }}
      </button>
    </div>

    <!-- Grille des Métriques -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- 1. Capital Total du Portefeuille -->
      <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-4.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Capital Portefeuille</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
            Base 1 000 $
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-white tracking-tight">
            ${{ totalPortfolioValueUsdc.toFixed(2) }}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Cash + Valorisation des positions
        </p>
      </div>

      <!-- 2. Cash Virtuel Disponible -->
      <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-4.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Cash Disponible</span>
          <span
            :class="availableCashUsdc > 5 ? 'text-emerald-400' : 'text-rose-400'"
            class="text-xs font-mono font-bold"
          >
            {{ availableCashUsdc > 5 ? 'Disponible' : 'Épuisé' }}
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span
            class="text-2xl font-bold font-mono tracking-tight"
            :class="availableCashUsdc > 5 ? 'text-emerald-400' : 'text-rose-400'"
          >
            ${{ availableCashUsdc.toFixed(2) }}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Solde prêt pour de nouveaux ordres
        </p>
      </div>

      <!-- 3. PnL Latent (Positions en cours) -->
      <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-4.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>PnL Non Réalisé (Latent)</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {{ positionsStore.positions.length }} position(s)
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span
            class="text-2xl font-bold font-mono tracking-tight"
            :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'text-emerald-400' : 'text-rose-400'"
          >
            {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Valeur estimée : ${{ positionsStore.totalPositionsValueUsdc.toFixed(2) }} USDC
        </p>
      </div>

      <!-- 4. Volume Copié Total -->
      <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-4.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Volume Tradé Répliqué</span>
          <span class="text-xs text-blue-400 font-mono">
            {{ metricsStore.metrics.totalCopiedTrades }} ordre(s)
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-white tracking-tight">
            ${{ metricsStore.metrics.totalTradedVolumeUsdc.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Total des ordres simulés avec succès
        </p>
      </div>

      <!-- 5. Filtre de Risque & Rejets -->
      <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-4.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Bouclier RiskManager</span>
          <span class="text-xs text-amber-400 font-mono">Protection</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {{ metricsStore.metrics.totalRejectedTrades }}
          </span>
          <span class="text-xs text-slate-400">trade(s) bloqué(s)</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Portefeuille vide ou plafonds évités
        </p>
      </div>
    </div>
  </div>
</template>
