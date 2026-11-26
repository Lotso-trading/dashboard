<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePortfolioMetrics } from "../composables/use-portfolio-metrics.ts";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import {
    formatCurrency,
    formatSignedCurrency,
    formatSignedPercent,
    formatTimestampTime,
} from "../utils/formatters.ts";
import Last24hSummarySection from "./Last24hSummarySection.vue";
import AppBadge from "./ui/AppBadge.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPageHeader from "./ui/AppPageHeader.vue";
import AppSegmentedFilter from "./ui/AppSegmentedFilter.vue";
import StatKpiCard from "./ui/StatKpiCard.vue";
import WalletAdjustmentModal from "./WalletAdjustmentModal.vue";

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL" | "POSITIONS") => void>();

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const positionsStore = usePositionsStore();
const last24hStore = useLast24hSummaryStore();

const selectedPeriod = ref<"24H" | "ALL">("24H");
const isWalletModalOpen = ref(false);
const walletModalAction = ref<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
const isMaxCashInApplying = ref(false);
const feedbackMessage = ref("");
const feedbackTone = ref<"success" | "warning">("success");

const lastRefreshedLabel = computed(() => {
    const ts = positionsStore.lastRefreshedAt ?? Date.now();
    return formatTimestampTime(ts, true);
});

const displayedClosedSummary = computed(() => {
    const src = selectedPeriod.value === "24H" ? last24hStore.totals24h : last24hStore.totalsAll;
    return {
        count: src.count,
        winsCount: src.winCount,
        lossesCount: src.lossCount,
        winRatePercent: src.winRate,
        roiClosedPercent: src.roiPercent,
        totalInvestedClosedUsdc: src.totalInvested,
        totalSettledPayoutUsdc: src.totalPayout,
        totalRealizedPnlUsdc: src.netPnl,
    };
});

const periodOptions = computed(() => [
    {
        value: "24H" as const,
        label: "24h",
        count: last24hStore.totals24h.count,
        icon: "zap" as const,
    },
    {
        value: "ALL" as const,
        label: "Tout",
        count: last24hStore.totalsAll.count,
        icon: "landmark" as const,
    },
]);

function showFeedback(message: string, tone: "success" | "warning" = "success"): void {
    feedbackMessage.value = message;
    feedbackTone.value = tone;
    setTimeout(() => {
        if (feedbackMessage.value === message) {
            feedbackMessage.value = "";
        }
    }, 5000);
}

async function handleMaxCashIn(): Promise<void> {
    isMaxCashInApplying.value = true;
    try {
        await configStore.updateConfig({ profitReinvestmentPercent: 0.0 });
        const syncRes = await positionsStore.requestBotSyncAndRefresh();
        await Promise.all([metricsStore.fetchMetrics(), last24hStore.loadClosedSummaries()]);
        showFeedback(
            `Mode Encaissement Max activé (100% des bénéfices protégés). ${syncRes.message}`,
            syncRes.botOnline ? "success" : "warning"
        );
    } finally {
        isMaxCashInApplying.value = false;
    }
}

async function refreshData(): Promise<void> {
    const syncRes = await positionsStore.requestBotSyncAndRefresh();
    await Promise.all([
        metricsStore.fetchMetrics(),
        last24hStore.loadClosedSummaries(),
        last24hStore.loadPage(),
    ]);
    showFeedback(syncRes.message, syncRes.botOnline ? "success" : "warning");
}

const {
    initialCapitalUsdc,
    availableCashUsdc,
    realizedPnlUsdc: totalRealizedPnlUsdc,
    peakRealizedPnlUsdc,
    totalSettledPayoutUsdc,
    totalPortfolioValueUsdc,
    overallRoiPercent,
} = usePortfolioMetrics();

const sanctuarizedProfitUsdc = computed<number>(() => {
    const peak = peakRealizedPnlUsdc.value;
    if (peak <= 0) return 0;
    const protectPercent = 100 - (configStore.config?.profitReinvestmentPercent ?? 50);
    return (peak * protectPercent) / 100;
});

const reinvestedProfitUsdc = computed<number>(() => {
    const pnl = totalRealizedPnlUsdc.value;
    if (pnl <= 0) return 0;
    return Math.max(0, pnl - sanctuarizedProfitUsdc.value);
});

const maxPotentialNetProfit = computed<number>(() => {
    return Math.max(0, positionsStore.totalPayoutPotentialUsdc - positionsStore.totalInvestedUsdc);
});

const unrealizedRoiPercent = computed<number>(() => {
    return (
        (positionsStore.totalUnrealizedPnlUsdc / Math.max(1, positionsStore.totalInvestedUsdc)) *
        100
    );
});

onMounted(async () => {
    await last24hStore.loadClosedSummaries();
});
</script>

<template>
  <div class="space-y-8">
    <!-- En-tête Synthèse -->
    <AppPageHeader
      title="Bilan Financier & Synthèse"
      subtitle="Grand livre comptable automatisé, résolutions Polymarket et valorisation du portefeuille"
      icon="gem"
    >
      <template #actions>
        <span
          class="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap"
        >
          <AppIcon name="clock" :size="13" />
          <span>Dernier rafraîchissement : {{ lastRefreshedLabel }}</span>
        </span>

        <button
          type="button"
          @click="handleMaxCashIn"
          :disabled="isMaxCashInApplying"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          title="Protège 100% des bénéfices futurs et demande une vérification immédiate au bot"
        >
          <AppIcon name="shield" :size="14" :class="{ 'animate-pulse': isMaxCashInApplying }" />
          <span>{{ isMaxCashInApplying ? "Sécurisation..." : "Sécuriser 100% gains" }}</span>
        </button>

        <button
          type="button"
          @click="refreshData"
          :disabled="positionsStore.isSettling"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-400 dark:hover:border-rose-500/40 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <AppIcon
            name="refresh-cw"
            :size="14"
            :class="{ 'animate-spin': positionsStore.isSettling }"
          />
          <span>{{ positionsStore.isSettling ? "Actualisation..." : "Actualiser & Vérifier" }}</span>
        </button>
      </template>
    </AppPageHeader>

    <!-- Feedback de synchronisation -->
    <div
      v-if="feedbackMessage"
      :class="[
        'p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2',
        feedbackTone === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
      ]"
    >
      <div class="flex items-center gap-2">
        <AppIcon :name="feedbackTone === 'success' ? 'check-circle' : 'alert-triangle'" :size="15" />
        <span>{{ feedbackMessage }}</span>
      </div>
      <button
        type="button"
        @click="feedbackMessage = ''"
        class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        aria-label="Fermer"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <!-- 1. Grand Livre Financier -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
          <AppIcon name="landmark" :size="15" class="text-rose-500" />
          <span>Grand Livre Financier (Base {{ formatCurrency(initialCapitalUsdc) }})</span>
        </h3>
        <AppBadge :variant="overallRoiPercent >= 0 ? 'success' : 'danger'" size="sm">
          ROI Global : {{ formatSignedPercent(overallRoiPercent) }}
        </AppBadge>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatKpiCard
          label="Cash Disponible"
          icon="wallet"
          icon-class="text-emerald-500"
          :value="formatCurrency(availableCashUsdc)"
          value-class="text-emerald-600 dark:text-emerald-400"
          subtitle="Solde libre pour répliquer de nouveaux signaux."
          :progress-percent="totalPortfolioValueUsdc > 0 ? (availableCashUsdc / totalPortfolioValueUsdc) * 100 : 0"
          progress-class="bg-emerald-500"
        />

        <StatKpiCard
          label="Capital Engagé"
          icon="briefcase"
          icon-class="text-blue-500"
          :value="formatCurrency(positionsStore.totalInvestedUsdc)"
          :badge-text="`${positionsStore.positions.length} marchés`"
          badge-variant="info"
          subtitle="Mises actuellement en jeu sur les marchés ouverts."
          :progress-percent="totalPortfolioValueUsdc > 0 ? (positionsStore.totalInvestedUsdc / totalPortfolioValueUsdc) * 100 : 0"
          progress-class="bg-blue-500"
        />

        <StatKpiCard
          label="Valeur au Carnet"
          icon="activity"
          icon-class="text-sky-500"
          :value="formatCurrency(positionsStore.totalPositionsValueUsdc)"
          value-class="text-sky-600 dark:text-sky-400"
          :badge-text="`${formatSignedCurrency(positionsStore.totalUnrealizedPnlUsdc)}`"
          :badge-variant="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'success' : 'danger'"
          :subtitle="`Plus-value latente : ${formatSignedPercent(unrealizedRoiPercent)}`"
        />

        <StatKpiCard
          label="Payout Max Garanti"
          icon="trophy"
          icon-class="text-amber-500"
          :value="formatCurrency(positionsStore.totalPayoutPotentialUsdc)"
          value-class="text-amber-600 dark:text-amber-400"
          badge-text="1,00 $ / part"
          badge-variant="warning"
          :subtitle="`Gain net potentiel max : +${formatCurrency(maxPotentialNetProfit)}`"
        />

        <StatKpiCard
          label="Bénéfices Encaissés"
          icon="coins"
          icon-class="text-emerald-500"
          :value="formatSignedCurrency(totalRealizedPnlUsdc)"
          :value-class="
            totalRealizedPnlUsdc >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          "
        >
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 space-y-1">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <AppIcon name="shield" :size="12" />
                <span>Protégé ({{ 100 - (configStore.config?.profitReinvestmentPercent ?? 50) }}%)</span>
              </span>
              <strong class="font-mono text-emerald-600 dark:text-emerald-400">
                +{{ formatCurrency(sanctuarizedProfitUsdc) }}
              </strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <AppIcon name="refresh-cw" :size="12" />
                <span>Réinvesti ({{ configStore.config?.profitReinvestmentPercent ?? 50 }}%)</span>
              </span>
              <strong class="font-mono text-blue-600 dark:text-blue-400">
                +{{ formatCurrency(reinvestedProfitUsdc) }}
              </strong>
            </div>
            <div
              class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono"
            >
              <span>Total Payouts :</span>
              <strong class="text-slate-900 dark:text-white">{{ formatCurrency(totalSettledPayoutUsdc) }}</strong>
            </div>
          </div>
        </StatKpiCard>

        <StatKpiCard
          label="Valeur Totale Portefeuille"
          icon="trending-up"
          icon-class="text-blue-600 dark:text-blue-400"
          :value="formatCurrency(totalPortfolioValueUsdc)"
          :badge-text="formatSignedPercent(overallRoiPercent)"
          :badge-variant="overallRoiPercent >= 0 ? 'info' : 'danger'"
          border-class="border-2 border-blue-500/40 dark:border-blue-500/50 bg-gradient-to-br from-blue-500/5 via-white to-emerald-500/5 dark:from-blue-950/30 dark:via-[#121721] dark:to-emerald-950/20"
          :subtitle="`Gain net total : ${formatSignedCurrency(totalPortfolioValueUsdc - initialCapitalUsdc)} USDC`"
        />
      </div>
    </div>

    <!-- 2. Bilan des Marchés Clôturés & Résolus (24h et Tout sans limite) -->
    <div
      class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs transition-colors"
    >
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800"
      >
        <div>
          <div class="flex items-center flex-wrap gap-2">
            <AppIcon name="trophy" :size="18" class="text-amber-500" />
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              Bilan des Marchés Clôturés & Résolus
            </h3>
            <AppBadge :variant="selectedPeriod === '24H' ? 'success' : 'info'" size="xs">
              {{ selectedPeriod === "24H" ? "24H" : "HISTORIQUE" }}
            </AppBadge>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{
              selectedPeriod === "24H"
                ? `${displayedClosedSummary.count} marché(s) résolu(s) sur les 24 dernières heures`
                : `${displayedClosedSummary.count} marché(s) résolu(s) depuis le début`
            }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <AppSegmentedFilter v-model="selectedPeriod" :options="periodOptions" size="xs" />

          <div class="flex items-center gap-3 text-xs font-mono whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
              <span class="h-2 w-2 rounded-full bg-emerald-500" />
              {{ displayedClosedSummary.winsCount }}W
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span class="h-2 w-2 rounded-full bg-rose-500" />
              {{ displayedClosedSummary.lossesCount }}L
            </span>
          </div>
        </div>
      </div>

      <!-- Barre de répartition W/L -->
      <div class="mt-5 space-y-2">
        <div class="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>
            Taux de réussite :
            <strong class="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              {{ displayedClosedSummary.winRatePercent.toFixed(1) }}%
            </strong>
          </span>
          <span>
            ROI réalisé :
            <strong
              :class="
                displayedClosedSummary.roiClosedPercent >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
              class="font-bold text-sm"
            >
              {{ formatSignedPercent(displayedClosedSummary.roiClosedPercent) }}
            </strong>
          </span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
          <template v-if="displayedClosedSummary.count > 0">
            <div
              class="bg-emerald-500 h-full transition-all duration-500"
              :style="{ width: `${displayedClosedSummary.winRatePercent}%` }"
            />
            <div
              class="bg-rose-500 h-full transition-all duration-500"
              :style="{ width: `${100 - displayedClosedSummary.winRatePercent}%` }"
            />
          </template>
          <div v-else class="bg-slate-200 dark:bg-slate-700/60 h-full w-full" />
        </div>
      </div>

      <!-- 4 chiffres clés du bilan -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Mises Engagées</span>
          <span class="text-base font-bold font-mono text-slate-900 dark:text-white">
            {{ formatCurrency(displayedClosedSummary.totalInvestedClosedUsdc) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Total Racheté</span>
          <span class="text-base font-bold font-mono text-slate-900 dark:text-white">
            {{ formatCurrency(displayedClosedSummary.totalSettledPayoutUsdc) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Bénéfice Net</span>
          <span
            class="text-base font-bold font-mono"
            :class="
              displayedClosedSummary.totalRealizedPnlUsdc >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            "
          >
            {{ formatSignedCurrency(displayedClosedSummary.totalRealizedPnlUsdc) }}
          </span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
          <span class="text-slate-500 dark:text-slate-400 block text-[11px]">Rendement Clôtures</span>
          <span
            class="text-base font-bold font-mono"
            :class="
              displayedClosedSummary.roiClosedPercent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            "
          >
            {{ formatSignedPercent(displayedClosedSummary.roiClosedPercent) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 3. Tableau paginé des résolutions (24h / Tout) -->
    <Last24hSummarySection :hide-kpis="true" @navigate="(tab) => emit('navigate', tab)" />

    <WalletAdjustmentModal
      v-if="isWalletModalOpen"
      :initial-action="walletModalAction"
      @close="isWalletModalOpen = false"
    />
  </div>
</template>
