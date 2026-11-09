<script setup lang="ts">
import { ref } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";

const configStore = useConfigStore();

const balancePercent = ref(Math.round((configStore.config?.balancePercentPerTrade ?? 0.03) * 100));
const maxSlippage = ref(configStore.config?.maxSlippagePercent ?? 2.0);
const maxCap = ref(configStore.config?.maxCapPerTradeUsdc ?? 50.0);
const maxExposureMarket = ref(configStore.config?.maxExposurePerMarketUsdc ?? 150.0);
const maxExposureWhale = ref(configStore.config?.maxExposurePerTargetUsdc ?? 300.0);
const minCashReserve = ref(configStore.config?.minCashReserveUsdc ?? 5.0);
const copySellOrders = ref(configStore.config?.copySellOrders ?? true);
const dryRun = ref(configStore.config?.dryRun ?? true);

const isSaving = ref(false);
const saveSuccess = ref(false);

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
  <div class="bg-[#121721] border border-slate-800/80 rounded-xl p-6">
    <!-- Header -->
    <div class="pb-4 border-b border-slate-800 mb-6">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>⚙️</span> Gestion du Risque & Paramètres d'Exécution
      </h3>
      <p class="text-xs text-slate-400">
        Définition des règles de dimensionnement du capital, anti-slippage et alertes
      </p>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6 max-w-2xl">
      <!-- 1. Dimensionnement au % de solde -->
      <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-white">
            1. Dimensionnement du Capital (% Solde Disponible)
          </label>
          <span class="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {{ balancePercent }}% du solde
          </span>
        </div>
        <p class="text-xs text-slate-400">
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
        <div class="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>1% (Ultra Sécurisé)</span>
          <span>5% (Modéré)</span>
          <span>15% (Agressif)</span>
        </div>
      </div>

      <!-- 2. Slippage Maximum -->
      <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-white">
            2. Slippage Maximum Toléré
          </label>
          <span class="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            +{{ maxSlippage }}% max
          </span>
        </div>
        <p class="text-xs text-slate-400">
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
        <div class="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0.5% (Strict)</span>
          <span>2.0% (Recommandé)</span>
          <span>5.0% (Tolérant)</span>
        </div>
      </div>

      <!-- 3. Plafond Absolu par Ordre -->
      <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
        <label class="block text-xs font-semibold text-white">
          3. Plafond Absolu en USDC par Trade
        </label>
        <p class="text-xs text-slate-400">
          Même si le pourcentage de votre solde donne un montant plus élevé, l'ordre ne dépassera jamais cette limite.
        </p>
        <div class="relative max-w-xs">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-mono">$</span>
          <input
            v-model.number="maxCap"
            type="number"
            min="5"
            step="5"
            class="w-full bg-[#121721] border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <!-- 4. Plafond d'Exposition par Marché & par Baleine -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Plafond par Marché -->
        <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
          <label class="block text-xs font-semibold text-white">
            4. Plafond Maxi par Marché (ConditionId)
          </label>
          <p class="text-[11px] text-slate-400">
            Empêche qu'une baleine n'accumule 100 ordres sur le même marché.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-mono">$</span>
            <input
              v-model.number="maxExposureMarket"
              type="number"
              min="10"
              step="10"
              class="w-full bg-[#121721] border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Plafond par Baleine -->
        <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
          <label class="block text-xs font-semibold text-white">
            5. Plafond Maxi par Baleine (Target)
          </label>
          <p class="text-[11px] text-slate-400">
            Capital maximal cumulé alloué à une seule cible.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-mono">$</span>
            <input
              v-model.number="maxExposureWhale"
              type="number"
              min="20"
              step="20"
              class="w-full bg-[#121721] border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- 6. Réserve de Cash Minimale (Seuil Portefeuille Vide) -->
      <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
        <label class="block text-xs font-semibold text-white">
          6. Réserve Cash Minimale (Bouclier Portefeuille Vide)
        </label>
        <p class="text-xs text-slate-400">
          Si votre solde disponible descend sous ce seuil (par défaut 5.00 USDC), tout nouvel achat est catégoriquement refusé.
        </p>
        <div class="relative max-w-xs">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-mono">$</span>
          <input
            v-model.number="minCashReserve"
            type="number"
            min="1"
            step="1"
            class="w-full bg-[#121721] border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <!-- 4. Toggles Sortie ALL & Mode Simulation -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Sortie ALL -->
        <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-white">Réplication Sorties ALL</div>
            <p class="text-[11px] text-slate-400 mt-0.5">Vendre automatiquement dès que la baleine vend</p>
          </div>
          <button
            type="button"
            @click="copySellOrders = !copySellOrders"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              copySellOrders ? 'bg-emerald-500' : 'bg-slate-700'
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
        <div class="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-white">Paper Trading (Dry-Run)</div>
            <p class="text-[11px] text-slate-400 mt-0.5">Simulation sans engager de vrais fonds</p>
          </div>
          <button
            type="button"
            @click="dryRun = !dryRun"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              dryRun ? 'bg-amber-500' : 'bg-slate-700'
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
          class="px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder les Paramètres' }}
        </button>

        <span v-if="saveSuccess" class="text-xs font-semibold text-emerald-400 flex items-center gap-1">
          ✓ Paramètres enregistrés avec succès
        </span>
      </div>
    </form>
  </div>
</template>
