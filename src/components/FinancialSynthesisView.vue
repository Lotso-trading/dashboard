<script setup lang="ts">
import { computed, ref } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import Last24hSummarySection from "./Last24hSummarySection.vue";
import WalletAdjustmentModal from "./WalletAdjustmentModal.vue";

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL" | "POSITIONS") => void>();

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();

const isWalletModalOpen = ref(false);
const walletModalAction = ref<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
const isMaxCashInApplying = ref(false);
const maxCashInFeedback = ref("");

function openWalletModal(action: "DEPOSIT" | "WITHDRAW"): void {
  walletModalAction.value = action;
  isWalletModalOpen.value = true;
}

async function handleMaxCashIn(): Promise<void> {
  isMaxCashInApplying.value = true;
  maxCashInFeedback.value = "";
  try {
    await configStore.updateConfig({
      profitReinvestmentPercent: 0.0,
    });
    await positionsStore.triggerSettlement();
    await metricsStore.fetchMetrics();
    maxCashInFeedback.value =
      "🎯 Mode Encaissement Max activé : 100% des bénéfices sanctuarisés dans votre portefeuille !";
    setTimeout(() => {
      maxCashInFeedback.value = "";
    }, 4000);
  } finally {
    isMaxCashInApplying.value = false;
  }
}

const initialCapitalUsdc = computed<number>((): number => {
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
const lastSyncTime = ref<string>(
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
);

const availableCashUsdc = computed<number>((): number => {
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

const totalPortfolioValueUsdc = computed<number>((): number => {
  return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
});

const overallRoiPercent = computed<number>((): number => {
  if (initialCapitalUsdc.value <= 0) return 0;
  return (
    ((totalPortfolioValueUsdc.value - initialCapitalUsdc.value) / initialCapitalUsdc.value) * 100
  );
});

const maxPotentialNetProfit = computed<number>((): number => {
  return Math.max(0, positionsStore.totalPayoutPotentialUsdc - positionsStore.totalInvestedUsdc);
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
</script>

<template>
  <div class="space-y-8 animate-fadeIn">
    <!-- Header Synthèse & Live Status -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">💎</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            Bilan Financier & Synthèse Lotso
          </h2>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span class="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            LIVE DB
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Grand livre comptable automatisé, résolutions d'oracles Polymarket CLOB et valorisation instantanée de Lotso • Mis à jour à {{ lastSyncTime }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="handleMaxCashIn"
          :disabled="isMaxCashInApplying"
          class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Verrouille 100% des bénéfices futurs et règle les marchés en attente pour encaisser un maximum de cash"
        >
          <span :class="{ 'animate-spin': isMaxCashInApplying }">🎯</span>
          {{ isMaxCashInApplying ? 'Sécurisation...' : 'Encaisser un max (100% sécurisé)' }}
        </button>

        <button
          type="button"
          @click="refreshData"
          :disabled="positionsStore.isSettling"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-400 dark:hover:border-rose-500/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span :class="{ 'animate-spin': positionsStore.isSettling }">🔄</span>
          {{ positionsStore.isSettling ? 'Vérification...' : 'Actualiser & Encaisser' }}
        </button>
      </div>
    </div>

    <!-- Feedback Encaisser un Max -->
    <div
      v-if="maxCashInFeedback"
      class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn"
    >
      <span>🛡️</span> {{ maxCashInFeedback }}
    </div>

    <!-- 1. Le Grand Livre Financier -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
          <span>🏛️</span> Grand Livre Financier Lotso (Base ${{ initialCapitalUsdc.toFixed(2) }} Initial)
        </h3>
        <span class="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          ROI Global : {{ overallRoiPercent >= 0 ? '+' : '' }}{{ overallRoiPercent.toFixed(1) }} %
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 1. Cash Disponible Immédiat -->
        <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
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

          <!-- Boutons Ajouter / Retirer des fonds -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <button
              type="button"
              @click="openWalletModal('DEPOSIT')"
              class="flex-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>➕</span> Ajouter des fonds
            </button>
            <button
              type="button"
              @click="openWalletModal('WITHDRAW')"
              class="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>➖</span> Retirer
            </button>
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
            <span class="font-medium">Bénéfices Encaissés (Sanctuarisés)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              PORTFOLIO
            </span>
          </div>
          <div class="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            +${{ positionsStore.totalRealizedPnlUsdc.toFixed(2) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Gains nets Polymarket définitivement sécurisés dans le portefeuille.
            <span class="block mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              🛡️ {{ 100 - (configStore.config?.profitReinvestmentPercent ?? 50) }}% sanctuarisé • Intouchable par le bot
            </span>
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

    <!-- 4. Résumé des Dernières 24 Heures -->
    <Last24hSummarySection @navigate="(tab) => emit('navigate', tab)" />

    <!-- Modale interactive d'Ajout / Retrait de Fonds (Dry-Run) -->
    <WalletAdjustmentModal
      v-if="isWalletModalOpen"
      :initial-action="walletModalAction"
      @close="isWalletModalOpen = false"
    />
  </div>
</template>
