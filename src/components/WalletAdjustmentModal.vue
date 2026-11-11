<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";

const props = withDefaults(
  defineProps<{
    initialAction?: "DEPOSIT" | "WITHDRAW";
  }>(),
  {
    initialAction: "DEPOSIT",
  }
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success", payload: { action: "DEPOSIT" | "WITHDRAW"; amount: number }): void;
}>();

const configStore = useConfigStore();
const metricsStore = useMetricsStore();

const activeAction = ref<"DEPOSIT" | "WITHDRAW">(props.initialAction);
const amount = ref<number | undefined>(100);
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

watch(
  () => props.initialAction,
  (newAction) => {
    activeAction.value = newAction;
    errorMessage.value = "";
    successMessage.value = "";
  }
);

const availableCash = computed(() => {
  return Number(metricsStore.metrics.availableCashUsdc ?? 0);
});

const currentSimulated = computed(() => {
  return Number(configStore.config?.simulatedBalanceUsdc ?? 1000.0);
});

const isWithdrawInvalid = computed(() => {
  if (activeAction.value !== "WITHDRAW") return false;
  if (!amount.value || amount.value <= 0) return true;
  return amount.value > availableCash.value;
});

function selectQuickAmount(val: number): void {
  amount.value = val;
  errorMessage.value = "";
}

function selectMaxWithdraw(): void {
  amount.value = Math.floor(availableCash.value * 100) / 100;
  errorMessage.value = "";
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = "";
  successMessage.value = "";

  if (!amount.value || amount.value <= 0) {
    errorMessage.value = "Veuillez saisir un montant supérieur à 0 USDC.";
    return;
  }

  if (activeAction.value === "WITHDRAW" && amount.value > availableCash.value) {
    errorMessage.value = `Retrait impossible : le montant demandé ($${amount.value.toFixed(2)}) dépasse votre cash libre disponible ($${availableCash.value.toFixed(2)}).`;
    return;
  }

  isSubmitting.value = true;
  try {
    const val = Number(amount.value);
    if (activeAction.value === "DEPOSIT") {
      await configStore.depositFunds(val);
      successMessage.value = `+${val.toFixed(2)} $ USDC ajoutés avec succès à votre portefeuille !`;
    } else {
      await configStore.withdrawFunds(val);
      successMessage.value = `-${val.toFixed(2)} $ USDC retirés avec succès de votre portefeuille.`;
    }

    await metricsStore.fetchMetrics();
    emit("success", { action: activeAction.value, amount: val });

    setTimeout(() => {
      emit("close");
    }, 1200);
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : "Erreur lors de la mise à jour du portefeuille.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
    <div class="bg-white dark:bg-[#121721] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative transition-colors">
      <!-- Header avec Bouton Fermer -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xl">{{ activeAction === 'DEPOSIT' ? '💰' : '💸' }}</span>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {{ activeAction === 'DEPOSIT' ? 'Ajouter des Fonds au Portefeuille' : 'Retirer des Fonds du Portefeuille' }}
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-bold">
                DRY-RUN
              </span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Gestion du solde virtuel et du capital disponible de Lotso
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Sélecteur d'action Dépôt / Retrait (Tabs) -->
      <div class="mt-4 grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          @click="activeAction = 'DEPOSIT'; errorMessage = ''; successMessage = ''"
          :class="[
            'py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            activeAction === 'DEPOSIT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>➕</span> Dépôt (Ajouter)
        </button>

        <button
          type="button"
          @click="activeAction = 'WITHDRAW'; errorMessage = ''; successMessage = ''"
          :class="[
            'py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            activeAction === 'WITHDRAW'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>➖</span> Retrait (Prélever)
        </button>
      </div>

      <!-- Statut du Portefeuille en direct -->
      <div class="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div>
          <span class="text-slate-400 text-[10px] uppercase font-semibold block">Cash Libre Immédiat :</span>
          <span class="text-base font-bold text-emerald-600 dark:text-emerald-400">
            ${{ availableCash.toFixed(2) }}
          </span>
        </div>
        <div class="text-right">
          <span class="text-slate-400 text-[10px] uppercase font-semibold block">Capital Virtuel Initial :</span>
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ${{ currentSimulated.toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- Formulaire d'Ajustement -->
      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <!-- Message de Succès ou d'Erreur -->
        <div v-if="successMessage" class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <span>✓</span> {{ successMessage }}
        </div>

        <div v-if="errorMessage" class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fadeIn">
          {{ errorMessage }}
        </div>

        <!-- Montants Rapides (Pills) -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Montants rapides en USDC :
          </label>
          <div v-if="activeAction === 'DEPOSIT'" class="grid grid-cols-5 gap-1.5 text-xs font-mono">
            <button
              v-for="val in [25, 50, 100, 500, 1000]"
              :key="val"
              type="button"
              @click="selectQuickAmount(val)"
              :class="[
                'py-1.5 rounded-lg border transition font-bold cursor-pointer text-center',
                amount === val
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50'
              ]"
            >
              +${{ val }}
            </button>
          </div>

          <div v-else class="grid grid-cols-5 gap-1.5 text-xs font-mono">
            <button
              v-for="val in [25, 50, 100, 500]"
              :key="val"
              type="button"
              @click="selectQuickAmount(val)"
              :disabled="val > availableCash"
              :class="[
                'py-1.5 rounded-lg border transition font-bold text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                amount === val
                  ? 'bg-rose-500 text-white border-rose-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-500/50'
              ]"
            >
              ${{ val }}
            </button>
            <button
              type="button"
              @click="selectMaxWithdraw"
              :disabled="availableCash <= 0"
              class="py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/20 transition cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>
        </div>

        <!-- Saisie du Montant Personnalisé -->
        <div>
          <label class="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
            {{ activeAction === 'DEPOSIT' ? 'Montant à ajouter au portefeuille :' : 'Montant à retirer du portefeuille :' }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm font-mono">$</span>
            <input
              v-model.number="amount"
              type="number"
              min="1"
              step="any"
              placeholder="Ex: 250"
              required
              class="w-full bg-white dark:bg-[#121721] border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-16 py-2.5 text-sm text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-blue-500"
            />
            <span class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 font-mono font-semibold">
              USDC
            </span>
          </div>

          <p v-if="activeAction === 'DEPOSIT'" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            💡 Ces fonds virtuels sont immédiatement disponibles pour répliquer de nouveaux ordres de baleines.
          </p>
          <p v-else class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            ⚠️ Le retrait est strictement limité à votre cash libre (${{ availableCash.toFixed(2) }} USDC). Le capital engagé dans des positions ouvertes ne peut être retiré qu'après clôture.
          </p>
        </div>

        <!-- Boutons d'Action -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="submit"
            :disabled="isSubmitting || isWithdrawInvalid"
            :class="[
              'px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50 shadow-sm cursor-pointer flex items-center gap-2',
              activeAction === 'DEPOSIT'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-500'
            ]"
          >
            <span v-if="isSubmitting" class="animate-spin">🔄</span>
            <span>{{ isSubmitting ? 'Traitement...' : activeAction === 'DEPOSIT' ? 'Confirmer l’Ajout de Fonds' : 'Confirmer le Retrait' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
