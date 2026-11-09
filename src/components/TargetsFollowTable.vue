<script setup lang="ts">
import { ref } from "vue";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import AddTargetModal from "./AddTargetModal.vue";

const targetsStore = useTargetsStore();
const isModalOpen = ref(false);

async function handleToggle(id: string, currentStatus: boolean): Promise<void> {
  await targetsStore.toggleTarget(id, !currentStatus);
}

async function handleDelete(id: string, alias: string): Promise<void> {
  if (confirm(`Confirmez-vous l'arrêt du suivi de la cible "${alias}" ?`)) {
    await targetsStore.removeTarget(id);
  }
}
</script>

<template>
  <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>🐋</span> Baleines Polymarket Suivies
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Gestion des cibles et réplication de leurs ordres on-chain et CLOB
        </p>
      </div>

      <button
        type="button"
        @click="isModalOpen = true"
        class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
      >
        <span>+</span> Suivre une Baleine
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/70 dark:bg-[#0B0E14]/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th class="py-3 px-6">Baleine / Alias</th>
            <th class="py-3 px-4">Statut</th>
            <th class="py-3 px-4">Poids</th>
            <th class="py-3 px-4">Plafond USDC</th>
            <th class="py-3 px-4">Trades Copiés</th>
            <th class="py-3 px-4">Volume Généré</th>
            <th class="py-3 px-4">PnL Réalisé</th>
            <th class="py-3 px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-200">
          <tr
            v-for="target in targetsStore.targets"
            :key="target.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition group"
          >
            <!-- Nom et Adresse -->
            <td class="py-3 px-6">
              <div class="flex items-center gap-2.5">
                <div class="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs">
                  {{ target.alias.slice(0, 1).toUpperCase() }}
                </div>
                <div>
                  <div class="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {{ target.alias }}
                  </div>
                  <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>{{ target.address.slice(0, 6) }}...{{ target.address.slice(-4) }}</span>
                    <a
                      :href="`https://polymarket.com/profile/${target.address}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:underline inline-flex items-center gap-0.5 text-[10px]"
                      title="Voir sur Polymarket"
                    >
                      Polymarket ↗
                    </a>
                  </div>
                </div>
              </div>
            </td>

            <!-- Switch On/Off -->
            <td class="py-3 px-4">
              <button
                type="button"
                @click="handleToggle(target.id, target.enabled)"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  target.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                ]"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    target.enabled ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </button>
            </td>

            <!-- Poids -->
            <td class="py-3 px-4 font-mono">
              <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {{ target.weightMultiplier.toFixed(1) }}x
              </span>
            </td>

            <!-- Plafond Max -->
            <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
              {{ target.maxUsdcPerTrade ? `$${target.maxUsdcPerTrade}` : 'Défaut' }}
            </td>

            <!-- Trades Copiés -->
            <td class="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">
              {{ target.stats.totalCopiedTrades }}
            </td>

            <!-- Volume Généré -->
            <td class="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200">
              ${{ target.stats.totalCopiedVolumeUsdc.toFixed(2) }}
            </td>

            <!-- PnL Réalisé -->
            <td class="py-3 px-4 font-mono font-semibold" :class="target.stats.realizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
              {{ target.stats.realizedPnlUsdc >= 0 ? '+' : '' }}${{ target.stats.realizedPnlUsdc.toFixed(2) }}
            </td>

            <!-- Actions -->
            <td class="py-3 px-6 text-right">
              <button
                type="button"
                @click="handleDelete(target.id, target.alias)"
                class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                title="Supprimer"
              >
                🗑️
              </button>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="targetsStore.targets.length === 0">
            <td colspan="8" class="text-center py-10 text-slate-400">
              <div class="text-2xl mb-2">🐋</div>
              <p class="font-medium text-slate-700 dark:text-slate-300">Aucune baleine Polymarket suivie pour le moment</p>
              <p class="text-xs text-slate-400 mt-1">Cliquez sur "+ Suivre une Baleine" pour ajouter votre premier trader gagnant.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <AddTargetModal v-if="isModalOpen" @close="isModalOpen = false" />
  </div>
</template>
