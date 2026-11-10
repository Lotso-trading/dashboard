<script setup lang="ts">
import { computed, ref } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();

const balancePercent = ref(Math.round((configStore.config?.balancePercentPerTrade ?? 0.03) * 100));
const maxSlippage = ref(configStore.config?.maxSlippagePercent ?? 2.0);
const maxCap = ref(configStore.config?.maxCapPerTradeUsdc ?? 50.0);
const maxExposureMarket = ref(configStore.config?.maxExposurePerMarketUsdc ?? 150.0);
const maxExposureWhale = ref(configStore.config?.maxExposurePerTargetUsdc ?? 300.0);
const minCashReserve = ref(configStore.config?.minCashReserveUsdc ?? 5.0);
const copySellOrders = ref(configStore.config?.copySellOrders ?? true);
const dryRun = ref(configStore.config?.dryRun ?? true);
const maxAllocatedCapital = ref(configStore.config?.maxAllocatedCapitalUsdc ?? 0);
const profitReinvestmentPercent = ref(configStore.config?.profitReinvestmentPercent ?? 50.0);

const isSaving = ref(false);
const saveSuccess = ref(false);

// Calcul dynamique de simulation en direct sous le slider
const hypotheticalGain = 50.0;
const baseCapitalForSimulation = computed(() => {
  if (maxAllocatedCapital.value && maxAllocatedCapital.value > 0) {
    return maxAllocatedCapital.value;
  }
  return metricsStore.metrics.initialCapitalUsdc || 100.0;
});

const simulatedGainsAllowed = computed(() => {
  return Math.round(hypotheticalGain * (profitReinvestmentPercent.value / 100) * 100) / 100;
});

const simulatedBotUsableCapital = computed(() => {
  return baseCapitalForSimulation.value + simulatedGainsAllowed.value;
});

const simulatedSanctuarizedProfit = computed(() => {
  return Math.round(hypotheticalGain * (1 - profitReinvestmentPercent.value / 100) * 100) / 100;
});

// Impact en direct sur les gains réels existants
const currentRealizedPnl = computed(() => metricsStore.metrics.realizedPnlUsdc ?? 0);
const currentRealizedGainsAllowed = computed(() => {
  if (currentRealizedPnl.value <= 0) return 0;
  return Math.round(currentRealizedPnl.value * (profitReinvestmentPercent.value / 100) * 100) / 100;
});
const currentRealizedGainsProtected = computed(() => {
  if (currentRealizedPnl.value <= 0) return 0;
  return Math.round((currentRealizedPnl.value - currentRealizedGainsAllowed.value) * 100) / 100;
});

async function handleSave(): Promise<void> {
  isSaving.value = true;
  saveSuccess.value = false;
  try {
    await configStore.updateConfig({
      balancePercentPerTrade: balancePercent.value / 100,
      maxSlippagePercent: maxSlippage.value,
      maxCapPerTradeUsdc: maxCap.value,
      maxExposurePerMarketUsdc: maxExposureMarket.value,
      maxExposurePerTargetUsdc: maxExposureWhale.value,
      minCashReserveUsdc: minCashReserve.value,
      copySellOrders: copySellOrders.value,
      dryRun: dryRun.value,
      maxAllocatedCapitalUsdc: maxAllocatedCapital.value,
      profitReinvestmentPercent: profitReinvestmentPercent.value,
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs transition-colors">
    <!-- Header -->
    <div class="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
      <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <span>⚙️</span> Protocole de Risque & Furtivité Lotso
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Règles de dimensionnement du capital, anti-slippage et seuils de discrétion opérationnelle
      </p>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6 max-w-2xl">
      <!-- Section Budget Alloué & Réinvestissement des Bénéfices -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-4">
        <!-- Plafond de Capital Alloué -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>💼</span> Capital Alloué à Lotso (USDC)
            </label>
            <span
              class="font-mono text-xs font-bold px-2 py-0.5 rounded border"
              :class="maxAllocatedCapital > 0 ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'"
            >
              {{ maxAllocatedCapital > 0 ? `$${maxAllocatedCapital} alloués` : 'Tout le Portefeuille' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Somme maximale du portefeuille utilisable par le bot (ex: 100 $ sur 500 $ disponibles). Laissez 0 pour utiliser tout le solde.
          </p>
          <div class="relative max-w-xs">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
            <input
              v-model.number="maxAllocatedCapital"
              type="number"
              min="0"
              step="10"
              placeholder="0 (tout le portefeuille)"
              class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Slider de Réinvestissement des Gains -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📈</span> Part des Bénéfices Réinvestissables
            </label>
            <span class="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {{ profitReinvestmentPercent }}% réinvesti
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Définit si les gains nets réalisés s'ajoutent au budget de trading ou sont sanctuarisés (protégés).
          </p>
          <input
            v-model.number="profitReinvestmentPercent"
            type="range"
            min="0"
            max="100"
            step="5"
            class="w-full accent-emerald-500 cursor-pointer"
          />
          <div class="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (Bénéfices Intouchables)</span>
            <span>50% (Équilibré)</span>
            <span>100% (Intérêts Composés)</span>
          </div>

          <!-- Encadré interactif de calcul en direct des gains -->
          <div class="mt-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-800/50 space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span class="flex items-center gap-1.5">
                <span>⚡</span> Calcul & Simulation en direct (Base : ${{ baseCapitalForSimulation }} alloués)
              </span>
              <span class="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {{ profitReinvestmentPercent }}% réinvesti • {{ 100 - profitReinvestmentPercent }}% sanctuarisé
              </span>
            </div>

            <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
              Pour un gain hypothétique de <strong class="text-emerald-600 dark:text-emerald-400 font-bold">+50,00 $</strong> (Portefeuille total = ${{ (baseCapitalForSimulation + 50).toFixed(2) }}) :
              <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div class="bg-white/80 dark:bg-black/20 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                  <span class="text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wider">Capital Utilisable par le Bot :</span>
                  <strong class="text-sm text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                    ${{ simulatedBotUsableCapital.toFixed(2) }}
                  </strong>
                  <span class="text-[10px] text-slate-400 block">
                    (${{ baseCapitalForSimulation }} base + ${{ simulatedGainsAllowed.toFixed(2) }} gains)
                  </span>
                </div>
                <div class="bg-white/80 dark:bg-black/20 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
                  <span class="text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wider">Bénéfices Sanctuarisés :</span>
                  <strong class="text-sm text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                    ${{ simulatedSanctuarizedProfit.toFixed(2) }}
                  </strong>
                  <span class="text-[10px] text-slate-400 block">
                    (Intouchables, protégés sur le compte)
                  </span>
                </div>
              </div>
            </div>

            <!-- Impact réel en direct sur les gains actuels du compte si > 0 -->
            <div v-if="currentRealizedPnl > 0" class="pt-2 border-t border-blue-200/60 dark:border-blue-800/40 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Gains réels actuels (+${{ currentRealizedPnl.toFixed(2) }}) :</span>
              <span class="font-mono font-semibold">
                <strong class="text-blue-600 dark:text-blue-400">+${{ currentRealizedGainsAllowed.toFixed(2) }}</strong> utilisables • 
                <strong class="text-emerald-600 dark:text-emerald-400">+${{ currentRealizedGainsProtected.toFixed(2) }}</strong> protégés
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 1. Dimensionnement au % de solde -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-slate-900 dark:text-white">
            1. Dimensionnement du Capital (% Solde Disponible)
          </label>
          <span class="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {{ balancePercent }}% du solde
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Chaque trade copié risquera exactement cette fraction de vos USDC disponibles sur Polygon.
        </p>
        <input
          v-model.number="balancePercent"
          type="range"
          min="1"
          max="15"
          step="1"
          class="w-full accent-blue-500 cursor-pointer"
        />
        <div class="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>1% (Ultra Sécurisé)</span>
          <span>5% (Modéré)</span>
          <span>15% (Agressif)</span>
        </div>
      </div>

      <!-- 2. Slippage Maximum -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-slate-900 dark:text-white">
            2. Slippage Maximum Toléré
          </label>
          <span class="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            +{{ maxSlippage }}% max
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Si le carnet d'ordres a déjà bougé au-delà de cette tolérance, l'ordre est automatiquement rejeté.
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

      <!-- 3. Plafond Absolu par Ordre -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
        <label class="block text-xs font-semibold text-slate-900 dark:text-white">
          3. Plafond Absolu en USDC par Trade
        </label>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Même si le pourcentage de votre solde donne un montant plus élevé, l'ordre ne dépassera jamais cette limite.
        </p>
        <div class="relative max-w-xs">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
          <input
            v-model.number="maxCap"
            type="number"
            min="5"
            step="5"
            class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <!-- 4. Plafond d'Exposition par Marché & par Baleine -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Plafond par Marché -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
          <label class="block text-xs font-semibold text-slate-900 dark:text-white">
            4. Plafond Maxi par Marché (ConditionId)
          </label>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Empêche qu'une baleine n'accumule 100 ordres sur le même marché.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
            <input
              v-model.number="maxExposureMarket"
              type="number"
              min="10"
              step="10"
              class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Plafond par Baleine -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
          <label class="block text-xs font-semibold text-slate-900 dark:text-white">
            5. Plafond Maxi par Baleine (Target)
          </label>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Capital maximal cumulé alloué à une seule cible.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
            <input
              v-model.number="maxExposureWhale"
              type="number"
              min="20"
              step="20"
              class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- 6. Réserve de Cash Minimale (Seuil Portefeuille Vide) -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-2">
        <label class="block text-xs font-semibold text-slate-900 dark:text-white">
          6. Réserve Cash Minimale (Bouclier Portefeuille Vide)
        </label>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Si votre solde disponible descend sous ce seuil (par défaut 5.00 USDC), tout nouvel achat est catégoriquement refusé.
        </p>
        <div class="relative max-w-xs">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-mono">$</span>
          <input
            v-model.number="minCashReserve"
            type="number"
            min="1"
            step="1"
            class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <!-- 7. Toggles Sortie ALL & Mode Simulation -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Sortie ALL -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-900 dark:text-white">Réplication Sorties ALL</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Vendre automatiquement dès que la baleine vend</p>
          </div>
          <button
            type="button"
            @click="copySellOrders = !copySellOrders"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              copySellOrders ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                copySellOrders ? 'translate-x-4' : 'translate-x-0'
              ]"
            />
          </button>
        </div>

        <!-- Mode Dry Run -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-900 dark:text-white">Simulation Furtive (Dry-Run)</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Calcul des ordres et surveillance sans engager de fonds réels</p>
          </div>
          <button
            type="button"
            @click="dryRun = !dryRun"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              dryRun ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                dryRun ? 'translate-x-4' : 'translate-x-0'
              ]"
            />
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-2 flex items-center gap-3">
        <button
          type="submit"
          :disabled="isSaving"
          class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder les Paramètres' }}
        </button>

        <span v-if="saveSuccess" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          ✓ Paramètres enregistrés avec succès
        </span>
      </div>
    </form>
  </div>
</template>
