<script setup lang="ts">
import { ref } from "vue";
import { useTargetsStore } from "../stores/use-targets.store.ts";

const emit = defineEmits<(e: "close") => void>();

const targetsStore = useTargetsStore();

const address = ref("");
const alias = ref("");
const proxyAddress = ref("");
const weightMultiplier = ref(1.0);
const maxUsdcPerTrade = ref<number | undefined>(undefined);

const isSubmitting = ref(false);
const errorMessage = ref("");

async function handleSubmit(): Promise<void> {
  errorMessage.value = "";

  if (!address.value.trim().match(/^0x[a-fA-F0-9]{40}$/)) {
    errorMessage.value =
      "L'adresse Polygon doit débuter par 0x suivi de 40 caractères hexadécimaux.";
    return;
  }

  if (!alias.value.trim()) {
    errorMessage.value = "L'alias du trader est obligatoire.";
    return;
  }

  isSubmitting.value = true;
  try {
    await targetsStore.addTarget({
      address: address.value.trim(),
      alias: alias.value.trim(),
      proxyAddress: proxyAddress.value.trim() || undefined,
      weightMultiplier: Number(weightMultiplier.value) || 1.0,
      maxUsdcPerTrade: maxUsdcPerTrade.value ? Number(maxUsdcPerTrade.value) : undefined,
      enabled: true,
    });
    emit("close");
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la cible.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
    <div class="bg-white dark:bg-[#121721] border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative transition-colors">
      <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>🐋</span> Suivre une Nouvelle Baleine Polymarket
        </h3>
        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <div v-if="errorMessage" class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          {{ errorMessage }}
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Adresse Wallet Polygon / Profil (0x...) *
          </label>
          <input
            v-model="address"
            type="text"
            required
            placeholder="0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
            class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Alias / Nom d'affichage *
          </label>
          <input
            v-model="alias"
            type="text"
            required
            placeholder="Ex: Whale Elections Alpha"
            class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Multiplicateur Poids
            </label>
            <input
              v-model.number="weightMultiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Plafond Max USDC
            </label>
            <input
              v-model.number="maxUsdcPerTrade"
              type="number"
              step="1"
              min="1"
              placeholder="Ex: 50"
              class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {{ isSubmitting ? 'Enregistrement...' : 'Ajouter la Baleine' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
