<script setup lang="ts">
import type { SortOrder, TargetTrader } from "@lotso-trading/shared";
import { computed, ref } from "vue";
import { usePagination } from "../composables/use-pagination.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import { formatCurrency, formatSignedCurrency, truncateAddress } from "../utils/formatters.ts";
import {
    computeTargetPerformance,
    sortTargets,
    type TargetPerformanceStats,
    type TargetSortField,
} from "../utils/targets-sort.ts";
import TargetFormModal from "./TargetFormModal.vue";
import AppBadge from "./ui/AppBadge.vue";
import AppEmptyState from "./ui/AppEmptyState.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPagination from "./ui/AppPagination.vue";
import AppSegmentedFilter from "./ui/AppSegmentedFilter.vue";
import AppToggle from "./ui/AppToggle.vue";
import SortableTh from "./ui/SortableTh.vue";

const targetsStore = useTargetsStore();
const positionsStore = usePositionsStore();

const isModalOpen = ref(false);
const editingTarget = ref<TargetTrader | null>(null);
const viewMode = ref<"CARDS" | "TABLE">("CARDS");
const sortBy = ref<TargetSortField>("realizedPnl");
const sortOrder = ref<SortOrder>("desc");

const viewOptions = [
    { value: "CARDS" as const, label: "Cartes", icon: "layout-grid" as const },
    { value: "TABLE" as const, label: "Liste", icon: "list" as const },
];

const sortOptions: { value: TargetSortField; label: string }[] = [
    { value: "realizedPnl", label: "Gain Net" },
    { value: "winRate", label: "% Victoire" },
    { value: "wl", label: "W / L" },
    { value: "trades", label: "Trades" },
];

const targetsPerformance = computed(() => {
    const map = new Map<string, TargetPerformanceStats>();
    for (const t of targetsStore.targets) {
        map.set(t.id, computeTargetPerformance(t, positionsStore.closedPositions));
    }
    return map;
});

const sortedTargets = computed(() => {
    return sortTargets(
        targetsStore.targets,
        targetsPerformance.value,
        sortBy.value,
        sortOrder.value
    );
});

const { page, pageSize, totalItems, totalPages, paginatedItems, setPage, setPageSize } =
    usePagination(sortedTargets);

function toggleSort(field: string): void {
    const typedField = field as TargetSortField;
    if (sortBy.value === typedField) {
        sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
    } else {
        sortBy.value = typedField;
        sortOrder.value = "desc";
    }
    setPage(1);
}

function toggleSortDirection(): void {
    sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
    setPage(1);
}

function openCreateModal(): void {
    editingTarget.value = null;
    isModalOpen.value = true;
}

function openEditModal(target: TargetTrader): void {
    editingTarget.value = target;
    isModalOpen.value = true;
}

function closeModal(): void {
    isModalOpen.value = false;
    editingTarget.value = null;
}

async function handleToggle(id: string, nextStatus: boolean): Promise<void> {
    await targetsStore.toggleTarget(id, nextStatus);
}

async function handleDelete(id: string, alias: string): Promise<void> {
    if (confirm(`Confirmez-vous l'arrêt du suivi de la cible "${alias}" ?`)) {
        await targetsStore.removeTarget(id);
    }
}
</script>

<template>
  <div
    class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
    >
      <div>
        <div class="flex items-center flex-wrap gap-2.5">
          <AppIcon name="target" :size="18" class="text-rose-500" />
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Cibles & Baleines sous les Radars
          </h3>
          <AppBadge variant="brand" size="xs">
            {{ targetsStore.targets.length }} traquées
          </AppBadge>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Surveillance silencieuse des portefeuilles cibles et réplication paramétrable
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Contrôle de tri (commun aux vues Cartes & Tableau) -->
        <div class="flex items-center gap-1.5 text-xs">
          <select
            v-model="sortBy"
            @change="setPage(1)"
            aria-label="Critère de tri des baleines"
            class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              Tri : {{ opt.label }}
            </option>
          </select>

          <button
            type="button"
            @click="toggleSortDirection"
            :title="sortOrder === 'desc' ? 'Ordre décroissant (cliquer pour inverser)' : 'Ordre croissant (cliquer pour inverser)'"
            class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
          >
            <AppIcon :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" :size="13" />
            <span>{{ sortOrder === "asc" ? "ASC" : "DESC" }}</span>
          </button>
        </div>

        <AppSegmentedFilter v-model="viewMode" :options="viewOptions" size="xs" />

        <button
          type="button"
          @click="openCreateModal"
          class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap"
        >
          <AppIcon name="plus" :size="14" />
          <span>Ajouter une baleine</span>
        </button>
      </div>
    </div>

    <!-- VUE CARTES -->
    <div v-if="viewMode === 'CARDS'" class="p-6">
      <div v-if="paginatedItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="target in paginatedItems"
          :key="target.id"
          class="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
        >
          <!-- En-tête carte -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm shrink-0"
              >
                {{ target.alias.slice(0, 1).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div
                  class="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition text-sm truncate"
                  :title="target.alias"
                >
                  {{ target.alias }}
                </div>
                <div class="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{{ truncateAddress(target.address) }}</span>
                  <a
                    :href="`https://polymarket.com/profile/${target.address}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-500 hover:underline inline-flex items-center gap-0.5 text-[10px] whitespace-nowrap"
                    title="Voir le profil sur Polymarket"
                  >
                    <span>Profil</span>
                    <AppIcon name="arrow-up-right" :size="11" />
                  </a>
                </div>
              </div>
            </div>

            <AppToggle
              :model-value="target.enabled"
              active-color="emerald"
              size="sm"
              :title="target.enabled ? 'Mettre en pause' : 'Activer'"
              @update:model-value="(val) => handleToggle(target.id, val)"
            />
          </div>

          <!-- Badges de configuration (1 ligne) -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <AppBadge variant="info" size="xs" rounded="md">
              {{ target.weightMultiplier.toFixed(1) }}x
            </AppBadge>
            <AppBadge variant="neutral" size="xs" rounded="md">
              Max {{ target.maxUsdcPerTrade ? `$${target.maxUsdcPerTrade}` : "Défaut" }}
            </AppBadge>
            <AppBadge
              :variant="target.enabled ? 'success' : 'neutral'"
              size="xs"
              :dot="true"
              :pulse="target.enabled"
            >
              {{ target.enabled ? "Actif" : "Pause" }}
            </AppBadge>
            <AppBadge
              v-if="(targetsPerformance.get(target.id)?.totalClosed ?? 0) > 0"
              variant="indigo"
              size="xs"
            >
              {{ (targetsPerformance.get(target.id)?.winRate ?? 0).toFixed(0) }}% W
            </AppBadge>
          </div>

          <!-- 4 Métriques -->
          <div
            class="grid grid-cols-4 gap-1.5 bg-white dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.04] text-center font-mono"
          >
            <div>
              <div class="text-[10px] text-slate-400 font-sans">Trades</div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {{ targetsPerformance.get(target.id)?.trades ?? 0 }}
              </div>
            </div>
            <div class="border-l border-slate-200/80 dark:border-white/[0.04]">
              <div class="text-[10px] text-slate-400 font-sans">W / L</div>
              <div class="text-xs font-bold mt-0.5 whitespace-nowrap">
                <span class="text-emerald-600 dark:text-emerald-400">{{ targetsPerformance.get(target.id)?.wins ?? 0 }}W</span>
                <span class="text-slate-400 mx-0.5">-</span>
                <span class="text-rose-600 dark:text-rose-400">{{ targetsPerformance.get(target.id)?.losses ?? 0 }}L</span>
              </div>
            </div>
            <div class="border-l border-slate-200/80 dark:border-white/[0.04]">
              <div class="text-[10px] text-slate-400 font-sans">Volume</div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {{ formatCurrency(targetsPerformance.get(target.id)?.volume, 0) }}
              </div>
            </div>
            <div class="border-l border-slate-200/80 dark:border-white/[0.04]">
              <div class="text-[10px] text-slate-400 font-sans">PnL</div>
              <div
                class="text-xs font-bold mt-0.5"
                :class="
                  (targetsPerformance.get(target.id)?.realizedPnl ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                "
              >
                {{ formatSignedCurrency(targetsPerformance.get(target.id)?.realizedPnl) }}
              </div>
            </div>
          </div>

          <!-- Actions carte -->
          <div
            class="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-white/[0.04]"
          >
            <a
              :href="`https://polymarket.com/profile/${target.address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
            >
              <span>Transactions</span>
              <AppIcon name="arrow-up-right" :size="12" />
            </a>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="openEditModal(target)"
                class="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 text-xs inline-flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-blue-500/10 cursor-pointer"
                title="Modifier cette baleine"
              >
                <AppIcon name="pencil" :size="13" />
                <span>Modifier</span>
              </button>

              <button
                type="button"
                @click="handleDelete(target.id, target.alias)"
                class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs inline-flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                title="Supprimer cette baleine"
              >
                <AppIcon name="trash" :size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppEmptyState
        v-else
        icon="target"
        title="Aucune cible sous surveillance"
        description="Cliquez sur « Ajouter une baleine » pour activer la réplication d'un portefeuille Polymarket."
      />
    </div>

    <!-- VUE TABLEAU -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr
            class="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/70 dark:bg-[#0B0E14]/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
          >
            <th class="py-3 px-6 whitespace-nowrap">Baleine / Alias</th>
            <th class="py-3 px-4 whitespace-nowrap">Statut</th>
            <th class="py-3 px-4 whitespace-nowrap">Poids</th>
            <th class="py-3 px-4 whitespace-nowrap">Plafond</th>
            <SortableTh
              label="Trades"
              field="trades"
              :active-field="sortBy"
              :sort-order="sortOrder"
              @sort="toggleSort"
            />
            <SortableTh
              label="W / L"
              field="wl"
              :active-field="sortBy"
              :sort-order="sortOrder"
              @sort="toggleSort"
            />
            <SortableTh
              label="% Victoire"
              field="winRate"
              :active-field="sortBy"
              :sort-order="sortOrder"
              @sort="toggleSort"
            />
            <th class="py-3 px-4 whitespace-nowrap">Volume</th>
            <SortableTh
              label="Gain Net"
              field="realizedPnl"
              :active-field="sortBy"
              :sort-order="sortOrder"
              @sort="toggleSort"
            />
            <th class="py-3 px-6 text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-200">
          <tr
            v-for="target in paginatedItems"
            :key="target.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition group"
          >
            <td class="py-3 px-6 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <div
                  class="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0"
                >
                  {{ target.alias.slice(0, 1).toUpperCase() }}
                </div>
                <div>
                  <div class="font-semibold text-slate-900 dark:text-white">
                    {{ target.alias }}
                  </div>
                  <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>{{ truncateAddress(target.address) }}</span>
                    <a
                      :href="`https://polymarket.com/profile/${target.address}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:underline inline-flex items-center gap-0.5 text-[10px]"
                    >
                      <span>Profil</span>
                      <AppIcon name="arrow-up-right" :size="10" />
                    </a>
                  </div>
                </div>
              </div>
            </td>

            <td class="py-3 px-4 whitespace-nowrap">
              <AppToggle
                :model-value="target.enabled"
                active-color="emerald"
                size="sm"
                @update:model-value="(val) => handleToggle(target.id, val)"
              />
            </td>

            <td class="py-3 px-4 whitespace-nowrap">
              <AppBadge variant="neutral" size="xs" rounded="md">
                {{ target.weightMultiplier.toFixed(1) }}x
              </AppBadge>
            </td>

            <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {{ target.maxUsdcPerTrade ? `$${target.maxUsdcPerTrade}` : "Défaut" }}
            </td>

            <td class="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {{ targetsPerformance.get(target.id)?.trades ?? 0 }}
            </td>

            <td class="py-3 px-4 font-mono whitespace-nowrap">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">
                {{ targetsPerformance.get(target.id)?.wins ?? 0 }}W
              </span>
              <span class="text-slate-400 mx-1">-</span>
              <span class="text-rose-600 dark:text-rose-400 font-semibold">
                {{ targetsPerformance.get(target.id)?.losses ?? 0 }}L
              </span>
            </td>

            <td class="py-3 px-4 whitespace-nowrap">
              <AppBadge
                :variant="
                  (targetsPerformance.get(target.id)?.totalClosed ?? 0) === 0
                    ? 'neutral'
                    : (targetsPerformance.get(target.id)?.winRate ?? 0) >= 50
                      ? 'success'
                      : 'danger'
                "
                size="xs"
              >
                {{ (targetsPerformance.get(target.id)?.winRate ?? 0).toFixed(1) }}%
              </AppBadge>
            </td>

            <td class="py-3 px-4 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {{ formatCurrency(targetsPerformance.get(target.id)?.volume) }}
            </td>

            <td
              class="py-3 px-4 font-mono font-bold whitespace-nowrap"
              :class="
                (targetsPerformance.get(target.id)?.realizedPnl ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
            >
              {{ formatSignedCurrency(targetsPerformance.get(target.id)?.realizedPnl) }}
            </td>

            <td class="py-3 px-6 text-right whitespace-nowrap">
              <div class="inline-flex items-center justify-end gap-1">
                <button
                  type="button"
                  @click="openEditModal(target)"
                  class="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/10 transition cursor-pointer"
                  title="Modifier"
                >
                  <AppIcon name="pencil" :size="14" />
                </button>
                <button
                  type="button"
                  @click="handleDelete(target.id, target.alias)"
                  class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                  title="Supprimer"
                >
                  <AppIcon name="trash" :size="14" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="paginatedItems.length === 0">
            <td colspan="10">
              <AppEmptyState
                icon="target"
                title="Aucune cible sous surveillance"
                description="Cliquez sur « Ajouter une baleine » pour démarrer la réplication."
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination globale (20/page ajustable) -->
    <AppPagination
      v-if="totalItems > 0"
      :page="page"
      :page-size="pageSize"
      :total-items="totalItems"
      :total-pages="totalPages"
      item-label="baleines"
      @update:page="setPage"
      @update:page-size="setPageSize"
    />

    <!-- Modale Création / Édition -->
    <TargetFormModal v-if="isModalOpen" :target="editingTarget" @close="closeModal" />
  </div>
</template>
