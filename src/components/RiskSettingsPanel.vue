<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { formatCurrency } from "../utils/formatters.ts";
import AppBadge from "./ui/AppBadge.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPageHeader from "./ui/AppPageHeader.vue";
import AppToggle from "./ui/AppToggle.vue";
import WalletAdjustmentModal from "./WalletAdjustmentModal.vue";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();

const isWalletModalOpen = ref(false);
const walletModalAction = ref<"DEPOSIT" | "WITHDRAW">("DEPOSIT");

// État local du formulaire
const balancePercent = ref(3);
const maxSlippage = ref(2.0);
const maxCap = ref(50.0);
const maxExposureMarket = ref(150.0);
const maxExposureWhale = ref(300.0);
const minCashReserve = ref(5.0);
const minTradeSize = ref(2.0);
const minPrice = ref(0.05);
const maxPrice = ref(0.9);
const copySellOrders = ref(true);
const dryRun = ref(true);
const useAllocatedCap = ref(false);
const maxAllocatedCapital = ref(0);
const profitReinvestmentPercent = ref(50.0);

const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref("");

function syncFormFromStore(): void {
    const cfg = configStore.config;
    if (!cfg) return;
    balancePercent.value = Math.round((cfg.balancePercentPerTrade ?? 0.03) * 100);
    maxSlippage.value = Number(cfg.maxSlippagePercent ?? 2.0);
    maxCap.value = Number(cfg.maxCapPerTradeUsdc ?? 50.0);
    maxExposureMarket.value = Number(cfg.maxExposurePerMarketUsdc ?? 150.0);
    maxExposureWhale.value = Number(cfg.maxExposurePerTargetUsdc ?? 300.0);
    minCashReserve.value = Number(cfg.minCashReserveUsdc ?? 5.0);
    minTradeSize.value = Number(cfg.minTradeSizeUsdc ?? 2.0);
    minPrice.value = Number(cfg.minPrice ?? 0.05);
    maxPrice.value = Number(cfg.maxPrice ?? 0.9);
    copySellOrders.value = Boolean(cfg.copySellOrders ?? true);
    dryRun.value = Boolean(cfg.dryRun ?? true);
    maxAllocatedCapital.value = Number(cfg.maxAllocatedCapitalUsdc ?? 0);
    useAllocatedCap.value = maxAllocatedCapital.value > 0;
    profitReinvestmentPercent.value = Number(cfg.profitReinvestmentPercent ?? 50.0);
}

const effectiveAllocatedCapital = computed(() =>
    useAllocatedCap.value ? Math.max(0, Number(maxAllocatedCapital.value || 0)) : 0
);

const hasUnsavedChanges = computed(() => {
    const cfg = configStore.config;
    if (!cfg) return false;
    return (
        Math.abs(balancePercent.value / 100 - cfg.balancePercentPerTrade) > 0.0001 ||
        Math.abs(maxSlippage.value - cfg.maxSlippagePercent) > 0.001 ||
        Math.abs(maxCap.value - cfg.maxCapPerTradeUsdc) > 0.001 ||
        Math.abs(maxExposureMarket.value - (cfg.maxExposurePerMarketUsdc ?? 150)) > 0.001 ||
        Math.abs(maxExposureWhale.value - (cfg.maxExposurePerTargetUsdc ?? 300)) > 0.001 ||
        Math.abs(minCashReserve.value - (cfg.minCashReserveUsdc ?? 5)) > 0.001 ||
        Math.abs(minTradeSize.value - (cfg.minTradeSizeUsdc ?? 2)) > 0.001 ||
        Math.abs(minPrice.value - cfg.minPrice) > 0.001 ||
        Math.abs(maxPrice.value - cfg.maxPrice) > 0.001 ||
        copySellOrders.value !== cfg.copySellOrders ||
        dryRun.value !== cfg.dryRun ||
        Math.abs(effectiveAllocatedCapital.value - (cfg.maxAllocatedCapitalUsdc ?? 0)) > 0.001 ||
        Math.abs(profitReinvestmentPercent.value - (cfg.profitReinvestmentPercent ?? 50)) > 0.001
    );
});

// Synchronisation initiale + réactive lorsque le store se met à jour sans écraser les éditions en cours
syncFormFromStore();
watch(
    () => configStore.config,
    () => {
        if (!hasUnsavedChanges.value) {
            syncFormFromStore();
        }
    },
    { deep: true }
);

function handleBudgetModeChange(enabled: boolean): void {
    useAllocatedCap.value = enabled;
    if (enabled && maxAllocatedCapital.value <= 0) {
        maxAllocatedCapital.value = Math.round(metricsStore.metrics.initialCapitalUsdc || 500);
    }
}

function openWalletModal(action: "DEPOSIT" | "WITHDRAW"): void {
    walletModalAction.value = action;
    isWalletModalOpen.value = true;
}

function setStrategyPreset(preset: "MAX_CASH_IN" | "BALANCED" | "COMPOUND"): void {
    if (preset === "MAX_CASH_IN") profitReinvestmentPercent.value = 0;
    else if (preset === "BALANCED") profitReinvestmentPercent.value = 50;
    else profitReinvestmentPercent.value = 100;
}

const availableCashForEstimate = computed(() => {
    return Number(
        metricsStore.metrics.availableCashUsdc ?? configStore.config?.simulatedBalanceUsdc ?? 1000
    );
});

const estimatedOrderUsdc = computed(() => {
    const raw = (availableCashForEstimate.value * balancePercent.value) / 100;
    return Math.min(maxCap.value, raw);
});

const baseCapitalForSimulation = computed(() => {
    if (effectiveAllocatedCapital.value > 0) {
        return effectiveAllocatedCapital.value;
    }
    return Number(
        configStore.config?.simulatedBalanceUsdc ?? metricsStore.metrics.initialCapitalUsdc ?? 1000
    );
});

const hypotheticalGain = 50.0;
const simulatedGainsAllowed = computed(
    () => Math.round(hypotheticalGain * (profitReinvestmentPercent.value / 100) * 100) / 100
);
const simulatedBotUsableCapital = computed(
    () => baseCapitalForSimulation.value + simulatedGainsAllowed.value
);
const simulatedSanctuarizedProfit = computed(
    () => Math.round(hypotheticalGain * (1 - profitReinvestmentPercent.value / 100) * 100) / 100
);

const currentRealizedPnl = computed(() => metricsStore.metrics.realizedPnlUsdc ?? 0);
const currentRealizedGainsAllowed = computed(() => {
    if (currentRealizedPnl.value <= 0) return 0;
    return (
        Math.round(currentRealizedPnl.value * (profitReinvestmentPercent.value / 100) * 100) / 100
    );
});
const currentRealizedGainsProtected = computed(() => {
    if (currentRealizedPnl.value <= 0) return 0;
    return Math.round((currentRealizedPnl.value - currentRealizedGainsAllowed.value) * 100) / 100;
});

async function handleSave(): Promise<void> {
    saveError.value = "";
    saveSuccess.value = false;

    if (minPrice.value >= maxPrice.value) {
        saveError.value = "La cote minimale doit être strictement inférieure à la cote maximale.";
        return;
    }

    isSaving.value = true;
    try {
        await configStore.updateConfig({
            balancePercentPerTrade: balancePercent.value / 100,
            maxSlippagePercent: maxSlippage.value,
            maxCapPerTradeUsdc: maxCap.value,
            maxExposurePerMarketUsdc: maxExposureMarket.value,
            maxExposurePerTargetUsdc: maxExposureWhale.value,
            minCashReserveUsdc: minCashReserve.value,
            minTradeSizeUsdc: minTradeSize.value,
            minPrice: minPrice.value,
            maxPrice: maxPrice.value,
            copySellOrders: copySellOrders.value,
            dryRun: dryRun.value,
            maxAllocatedCapitalUsdc: effectiveAllocatedCapital.value,
            profitReinvestmentPercent: profitReinvestmentPercent.value,
        });
        saveSuccess.value = true;
        setTimeout(() => {
            saveSuccess.value = false;
        }, 3000);
    } catch (err: unknown) {
        saveError.value =
            err instanceof Error ? err.message : "Erreur lors de la sauvegarde des paramètres.";
    } finally {
        isSaving.value = false;
    }
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête de la page -->
    <AppPageHeader
      title="Protocole & Gestion du Risque"
      subtitle="Configurez le mode d'exécution, l'allocation de capital, les plafonds d'exposition et les gardes-fous"
      icon="settings"
    >
      <template #badges>
        <AppBadge :variant="dryRun ? 'warning' : 'success'" size="sm" :dot="true" :pulse="!dryRun">
          {{ dryRun ? "Mode Simu" : "Mode Live" }}
        </AppBadge>
        <AppBadge v-if="hasUnsavedChanges" variant="warning" size="sm">
          Non enregistré
        </AppBadge>
      </template>
    </AppPageHeader>

    <form @submit.prevent="handleSave" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- COLONNE PRINCIPALE (4 cartes thématiques claires) -->
      <div class="lg:col-span-8 space-y-5">
        <!-- CARTE 1 : Mode d'Exécution & Portefeuille -->
        <section
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AppIcon name="sliders" :size="16" class="text-rose-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Mode d'Exécution & Sorties
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Mode Dry-Run -->
            <div
              class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
            >
              <div>
                <div class="text-xs font-semibold text-slate-900 dark:text-white">
                  Mode Simulation (Dry-Run)
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Simule les ordres sans engager de fonds réels sur Polygon.
                </p>
              </div>
              <AppToggle v-model="dryRun" active-color="amber" size="sm" />
            </div>

            <!-- Réplication Sorties SELL -->
            <div
              class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
            >
              <div>
                <div class="text-xs font-semibold text-slate-900 dark:text-white">
                  Répliquer les ventes (SELL)
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Liquide automatiquement la position dès qu'une baleine vend.
                </p>
              </div>
              <AppToggle v-model="copySellOrders" active-color="emerald" size="sm" />
            </div>
          </div>

          <!-- Alerte Mode Live -->
          <div
            v-if="!dryRun"
            class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2"
          >
            <AppIcon name="alert-triangle" :size="15" />
            <span>
              <strong>Attention :</strong> le mode <strong>Live CLOB</strong> exécute des ordres réels avec votre portefeuille Polygon.
            </span>
          </div>

          <!-- Gestion Solde Virtuel (en Dry-Run) -->
          <div
            v-else
            class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="space-y-0.5">
              <div class="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AppIcon name="wallet" :size="14" class="text-amber-500" />
                <span>Portefeuille Virtuel (Dry-Run)</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Capital virtuel actuel :
                <strong class="font-mono text-amber-600 dark:text-amber-400">
                  {{ formatCurrency(configStore.config?.simulatedBalanceUsdc ?? 1000) }} USDC
                </strong>
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                @click="openWalletModal('DEPOSIT')"
                class="px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AppIcon name="plus" :size="13" />
                <span>Dépôt</span>
              </button>
              <button
                type="button"
                @click="openWalletModal('WITHDRAW')"
                class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AppIcon name="minus" :size="13" />
                <span>Retrait</span>
              </button>
            </div>
          </div>
        </section>

        <!-- CARTE 2 : Budget & Stratégie des Bénéfices -->
        <section
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-5"
        >
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AppIcon name="shield" :size="16" class="text-emerald-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Budget Alloué & Protection des Gains
            </h3>
          </div>

          <!-- Toggle Budget Illimité vs Fixe -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold text-slate-900 dark:text-white">
                  Limiter le budget engagé par le bot
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {{
                    useAllocatedCap
                      ? "Le bot ne dépassera pas le montant fixe défini ci-dessous."
                      : "Le bot peut utiliser l'ensemble du solde libre disponible."
                  }}
                </p>
              </div>
              <AppToggle
                :model-value="useAllocatedCap"
                active-color="blue"
                size="sm"
                @update:model-value="handleBudgetModeChange"
              />
            </div>

            <div v-if="useAllocatedCap" class="pt-2 flex items-center gap-3">
              <div class="relative max-w-[200px] flex-1">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
                <input
                  v-model.number="maxAllocatedCapital"
                  type="number"
                  min="10"
                  step="10"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">
                USDC max confiés au bot
              </span>
            </div>
          </div>

          <!-- Presets Stratégie -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-slate-900 dark:text-white">
                Réinvestissement des bénéfices réalisés
              </span>
              <AppBadge variant="success" size="sm">
                {{ profitReinvestmentPercent }}% réinvesti
              </AppBadge>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                @click="setStrategyPreset('MAX_CASH_IN')"
                :class="[
                  'p-3 rounded-xl border text-left transition cursor-pointer space-y-1',
                  profitReinvestmentPercent === 0
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#0B0E14] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40',
                ]"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold">Sécurité Max</span>
                  <AppBadge variant="success" size="xs">0%</AppBadge>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  100% des bénéfices protégés hors de portée du bot.
                </p>
              </button>

              <button
                type="button"
                @click="setStrategyPreset('BALANCED')"
                :class="[
                  'p-3 rounded-xl border text-left transition cursor-pointer space-y-1',
                  profitReinvestmentPercent === 50
                    ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-[#0B0E14] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/40',
                ]"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold">Équilibré</span>
                  <AppBadge variant="info" size="xs">50%</AppBadge>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  Moitié sécurisée, moitié réinvestie automatiquement.
                </p>
              </button>

              <button
                type="button"
                @click="setStrategyPreset('COMPOUND')"
                :class="[
                  'p-3 rounded-xl border text-left transition cursor-pointer space-y-1',
                  profitReinvestmentPercent === 100
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/30'
                    : 'bg-slate-50 dark:bg-[#0B0E14] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40',
                ]"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold">Composés</span>
                  <AppBadge variant="indigo" size="xs">100%</AppBadge>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  Croissance maximale : tous les gains sont réinjectés.
                </p>
              </button>
            </div>

            <div class="pt-1 space-y-1">
              <input
                v-model.number="profitReinvestmentPercent"
                type="range"
                min="0"
                max="100"
                step="5"
                class="w-full accent-emerald-500 cursor-pointer"
              />
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% réinvesti</span>
                <span>50%</span>
                <span>100% réinvesti</span>
              </div>
            </div>
          </div>
        </section>

        <!-- CARTE 3 : Dimensionnement & Plafonds -->
        <section
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AppIcon name="scale" :size="16" class="text-blue-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Dimensionnement & Plafonds d'Exposition
            </h3>
          </div>

          <!-- Slider % par trade avec aperçu en $ -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="text-xs font-semibold text-slate-900 dark:text-white">
                Taille par ordre (% du cash libre)
              </label>
              <div class="flex items-center gap-2">
                <AppBadge variant="info" size="sm">{{ balancePercent }}%</AppBadge>
                <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  ≈ {{ formatCurrency(estimatedOrderUsdc) }} / trade
                </span>
              </div>
            </div>
            <input
              v-model.number="balancePercent"
              type="range"
              min="1"
              max="15"
              step="1"
              class="w-full accent-blue-500 cursor-pointer"
            />
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1% (Prudent)</span>
              <span>5% (Modéré)</span>
              <span>15% (Agressif)</span>
            </div>
          </div>

          <!-- Grille 3 plafonds -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label class="block text-xs font-semibold text-slate-900 dark:text-white">
                Max par ordre
              </label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Limite absolue par trade
              </p>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-mono">$</span>
                <input
                  v-model.number="maxCap"
                  type="number"
                  min="5"
                  step="5"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label class="block text-xs font-semibold text-slate-900 dark:text-white">
                Max par marché
              </label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Anti-accumulation sur 1 marché
              </p>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-mono">$</span>
                <input
                  v-model.number="maxExposureMarket"
                  type="number"
                  min="10"
                  step="10"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label class="block text-xs font-semibold text-slate-900 dark:text-white">
                Max par baleine
              </label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Exposition cumulée par cible
              </p>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-mono">$</span>
                <input
                  v-model.number="maxExposureWhale"
                  type="number"
                  min="20"
                  step="20"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- CARTE 4 : Sécurité & Tolérances d'Exécution -->
        <section
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AppIcon name="alert-triangle" :size="16" class="text-amber-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Sécurité & Tolérances d'Exécution
            </h3>
          </div>

          <!-- Slippage -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <label class="text-xs font-semibold text-slate-900 dark:text-white">
                Slippage maximum toléré
              </label>
              <AppBadge variant="warning" size="sm">+{{ maxSlippage.toFixed(1) }}%</AppBadge>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Rejette automatiquement l'ordre si le prix du carnet a trop glissé.
            </p>
            <input
              v-model.number="maxSlippage"
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              class="w-full accent-amber-500 cursor-pointer"
            />
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.5% (Strict)</span>
              <span>2.0% (Recommandé)</span>
              <span>5.0% (Tolérant)</span>
            </div>
          </div>

          <!-- Réserve Cash + Taille min + Bornes de cotes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1">
              <label class="block text-[11px] font-semibold text-slate-900 dark:text-white">
                Réserve Cash Min
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-mono">$</span>
                <input
                  v-model.number="minCashReserve"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1">
              <label class="block text-[11px] font-semibold text-slate-900 dark:text-white">
                Ordre Minimum
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-mono">$</span>
                <input
                  v-model.number="minTradeSize"
                  type="number"
                  min="1"
                  step="0.5"
                  class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1">
              <label class="block text-[11px] font-semibold text-slate-900 dark:text-white">
                Cote Min ($0.01–0.50)
              </label>
              <input
                v-model.number="minPrice"
                type="number"
                min="0.01"
                max="0.50"
                step="0.01"
                class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-1">
              <label class="block text-[11px] font-semibold text-slate-900 dark:text-white">
                Cote Max ($0.50–0.99)
              </label>
              <input
                v-model.number="maxPrice"
                type="number"
                min="0.50"
                max="0.99"
                step="0.01"
                class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>
      </div>

      <!-- COLONNE DROITE STICKY : Simulateur d'impact + Actions -->
      <aside class="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
        <!-- Carte Simulateur -->
        <div
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span class="text-xs font-bold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
              <AppIcon name="zap" :size="14" class="text-blue-500" />
              <span>Aperçu en Direct</span>
            </span>
            <AppBadge variant="info" size="xs">
              Base {{ formatCurrency(baseCapitalForSimulation, 0) }}
            </AppBadge>
          </div>

          <!-- Barre visuelle Réinvesti vs Protégé -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-[11px] font-mono">
              <span class="text-blue-600 dark:text-blue-400 font-semibold">
                Réinvesti : {{ profitReinvestmentPercent }}%
              </span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">
                Protégé : {{ 100 - profitReinvestmentPercent }}%
              </span>
            </div>
            <div class="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              <div
                class="bg-blue-500 h-full transition-all duration-300"
                :style="{ width: `${profitReinvestmentPercent}%` }"
              />
              <div
                class="bg-emerald-500 h-full transition-all duration-300"
                :style="{ width: `${100 - profitReinvestmentPercent}%` }"
              />
            </div>
          </div>

          <!-- Simulation +50$ -->
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              Simulation pour <strong class="text-emerald-600 dark:text-emerald-400 font-mono">+$50.00</strong> de gains :
            </div>
            <div class="flex justify-between font-mono">
              <span class="text-slate-500 dark:text-slate-400">Budget bot :</span>
              <strong class="text-blue-600 dark:text-blue-400">{{ formatCurrency(simulatedBotUsableCapital) }}</strong>
            </div>
            <div class="flex justify-between font-mono">
              <span class="text-slate-500 dark:text-slate-400">Sanctuarisé :</span>
              <strong class="text-emerald-600 dark:text-emerald-400">+{{ formatCurrency(simulatedSanctuarizedProfit) }}</strong>
            </div>
          </div>

          <!-- Impact sur les gains réels -->
          <div
            v-if="currentRealizedPnl > 0"
            class="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5 text-[11px] font-mono"
          >
            <div class="font-sans font-semibold text-slate-700 dark:text-slate-200">
              Impact sur vos gains actuels (+{{ formatCurrency(currentRealizedPnl) }}) :
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">Utilisable :</span>
              <strong class="text-blue-600 dark:text-blue-400">+{{ formatCurrency(currentRealizedGainsAllowed) }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">Protégé :</span>
              <strong class="text-emerald-600 dark:text-emerald-400">+{{ formatCurrency(currentRealizedGainsProtected) }}</strong>
            </div>
          </div>

          <!-- Résumé rapide des règles -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <div class="flex justify-between">
              <span>Ordre estimé :</span>
              <strong class="text-slate-900 dark:text-white">{{ formatCurrency(estimatedOrderUsdc) }}</strong>
            </div>
            <div class="flex justify-between">
              <span>Slippage max :</span>
              <strong class="text-slate-900 dark:text-white">+{{ maxSlippage.toFixed(1) }}%</strong>
            </div>
            <div class="flex justify-between">
              <span>Plage de cotes :</span>
              <strong class="text-slate-900 dark:text-white">${{ minPrice.toFixed(2) }} – ${{ maxPrice.toFixed(2) }}</strong>
            </div>
            <div class="flex justify-between">
              <span>Réserve min :</span>
              <strong class="text-slate-900 dark:text-white">{{ formatCurrency(minCashReserve) }}</strong>
            </div>
          </div>
        </div>

        <!-- Carte Sauvegarde -->
        <div
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs space-y-3"
        >
          <div
            v-if="saveError"
            class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5"
          >
            <AppIcon name="alert-triangle" :size="14" />
            <span>{{ saveError }}</span>
          </div>

          <div
            v-if="saveSuccess"
            class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5"
          >
            <AppIcon name="check-circle" :size="14" />
            <span>Paramètres enregistrés et diffusés au bot.</span>
          </div>

          <div class="flex flex-col gap-2">
            <button
              type="submit"
              :disabled="isSaving || !hasUnsavedChanges"
              class="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <AppIcon v-if="isSaving" name="refresh-cw" :size="14" class="animate-spin" />
              <AppIcon v-else name="check" :size="14" />
              <span>{{ isSaving ? "Sauvegarde..." : "Sauvegarder les paramètres" }}</span>
            </button>

            <button
              v-if="hasUnsavedChanges"
              type="button"
              @click="syncFormFromStore"
              class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <AppIcon name="rotate-ccw" :size="13" />
              <span>Annuler les modifications</span>
            </button>
          </div>
        </div>
      </aside>
    </form>

    <WalletAdjustmentModal
      v-if="isWalletModalOpen"
      :initial-action="walletModalAction"
      @close="isWalletModalOpen = false"
    />
  </div>
</template>
