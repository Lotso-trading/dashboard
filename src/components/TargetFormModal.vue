<script setup lang="ts">
import type { TargetTrader } from "@lotso-trading/shared";
import { computed, ref, watch } from "vue";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import AppIcon from "./ui/AppIcon.vue";
import AppModal from "./ui/AppModal.vue";
import AppToggle from "./ui/AppToggle.vue";

const props = defineProps<{
    target?: TargetTrader | null;
}>();

const emit = defineEmits<(e: "close") => void>();

const targetsStore = useTargetsStore();

const isEditMode = computed(() => Boolean(props.target));

const address = ref(props.target?.address ?? "");
const alias = ref(props.target?.alias ?? "");
const proxyAddress = ref(props.target?.proxyAddress ?? "");
const weightMultiplier = ref(props.target?.weightMultiplier ?? 1.0);
const maxUsdcPerTrade = ref<string>(
    props.target?.maxUsdcPerTrade !== undefined ? String(props.target.maxUsdcPerTrade) : ""
);
const enabled = ref(props.target?.enabled ?? true);

const isSubmitting = ref(false);
const errorMessage = ref("");

watch(
    () => props.target,
    (next) => {
        address.value = next?.address ?? "";
        alias.value = next?.alias ?? "";
        proxyAddress.value = next?.proxyAddress ?? "";
        weightMultiplier.value = next?.weightMultiplier ?? 1.0;
        maxUsdcPerTrade.value =
            next?.maxUsdcPerTrade !== undefined ? String(next.maxUsdcPerTrade) : "";
        enabled.value = next?.enabled ?? true;
        errorMessage.value = "";
    }
);

async function handleSubmit(): Promise<void> {
    errorMessage.value = "";

    const trimmedAlias = alias.value.trim();
    if (!trimmedAlias) {
        errorMessage.value = "L'alias du trader est obligatoire.";
        return;
    }

    const trimmedProxy = proxyAddress.value.trim();
    if (trimmedProxy && !/^0x[a-fA-F0-9]{40}$/.test(trimmedProxy)) {
        errorMessage.value =
            "L'adresse proxy doit débuter par 0x suivi de 40 caractères hexadécimaux.";
        return;
    }

    const parsedWeight = Number(weightMultiplier.value);
    if (Number.isNaN(parsedWeight) || parsedWeight < 0.01 || parsedWeight > 10) {
        errorMessage.value = "Le multiplicateur de poids doit être compris entre 0.01 et 10.";
        return;
    }

    const trimmedCap = maxUsdcPerTrade.value.trim();
    let parsedCap: number | null | undefined;
    if (trimmedCap === "") {
        parsedCap = isEditMode.value ? null : undefined;
    } else {
        const num = Number(trimmedCap);
        if (Number.isNaN(num) || num <= 0) {
            errorMessage.value = "Le plafond max USDC doit être supérieur à 0.";
            return;
        }
        parsedCap = num;
    }

    isSubmitting.value = true;
    try {
        if (isEditMode.value && props.target) {
            await targetsStore.updateTarget(props.target.id, {
                alias: trimmedAlias,
                ...(trimmedProxy ? { proxyAddress: trimmedProxy } : {}),
                weightMultiplier: parsedWeight,
                maxUsdcPerTrade: parsedCap,
                enabled: enabled.value,
            });
        } else {
            const trimmedAddress = address.value.trim();
            if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
                errorMessage.value =
                    "L'adresse Polygon doit débuter par 0x suivi de 40 caractères hexadécimaux.";
                isSubmitting.value = false;
                return;
            }
            await targetsStore.addTarget({
                address: trimmedAddress,
                alias: trimmedAlias,
                proxyAddress: trimmedProxy || undefined,
                weightMultiplier: parsedWeight,
                maxUsdcPerTrade: typeof parsedCap === "number" ? parsedCap : undefined,
                enabled: enabled.value,
            });
        }
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
  <AppModal
    :title="isEditMode ? 'Modifier la Baleine' : 'Traquer une Nouvelle Cible'"
    :subtitle="
      isEditMode
        ? 'Ajustez l\'alias, le multiplicateur ou le plafond d\'ordre de cette cible'
        : 'Ajoutez une adresse Polygon Polymarket à répliquer sous les radars'
    "
    :icon="isEditMode ? 'pencil' : 'target'"
    @close="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div
        v-if="errorMessage"
        class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
      >
        <AppIcon name="alert-triangle" :size="14" />
        <span>{{ errorMessage }}</span>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Adresse Wallet Polygon (0x...) *
        </label>
        <input
          v-model="address"
          type="text"
          required
          :disabled="isEditMode"
          placeholder="0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
          class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
          maxlength="50"
          placeholder="Ex: Whale Elections Alpha"
          class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Adresse Proxy (optionnel)
        </label>
        <input
          v-model="proxyAddress"
          type="text"
          placeholder="0x... (si différent du wallet principal)"
          class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500"
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
            max="10.0"
            class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Plafond Max USDC
          </label>
          <input
            v-model="maxUsdcPerTrade"
            type="number"
            step="1"
            min="1"
            placeholder="Défaut global"
            class="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <p class="text-[10px] text-slate-400 mt-0.5">Laisser vide pour le plafond global</p>
        </div>
      </div>

      <div
        class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
      >
        <div>
          <div class="text-xs font-semibold text-slate-900 dark:text-white">
            Surveillance active
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Active la réplication des ordres pour cette baleine
          </p>
        </div>
        <AppToggle v-model="enabled" active-color="emerald" size="sm" />
      </div>

      <div class="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm inline-flex items-center gap-1.5"
        >
          <AppIcon v-if="isSubmitting" name="refresh-cw" :size="13" class="animate-spin" />
          <span>
            {{
              isSubmitting
                ? "Enregistrement..."
                : isEditMode
                  ? "Enregistrer les modifications"
                  : "Activer la surveillance"
            }}
          </span>
        </button>
      </div>
    </form>
  </AppModal>
</template>
