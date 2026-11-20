<script setup lang="ts">
import type { TradeModeFilter, TradeSortField } from "@lotso-trading/shared";
import { computed, onMounted, ref } from "vue";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import {
    type TradeSideFilter,
    type TradeStatusFilter,
    useTradesStore,
} from "../stores/use-trades.store.ts";
import {
    formatCurrency,
    formatTimestampDateTime,
    formatTimestampTime,
    truncateAddress,
} from "../utils/formatters.ts";
import { getPolymarketUrl } from "../utils/polymarket-url.ts";
import AppBadge, { type BadgeVariant } from "./ui/AppBadge.vue";
import AppEmptyState from "./ui/AppEmptyState.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPagination from "./ui/AppPagination.vue";
import AppSegmentedFilter from "./ui/AppSegmentedFilter.vue";
import SortableTh from "./ui/SortableTh.vue";

const props = withDefaults(
    defineProps<{
        compact?: boolean;
    }>(),
    {
        compact: false,
    }
);

const tradesStore = useTradesStore();
const targetsStore = useTargetsStore();

const localSearch = ref(tradesStore.searchQuery);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const statusOptions = [
    { value: "ALL" as TradeStatusFilter, label: "Tous" },
    {
        value: "FILLED" as TradeStatusFilter,
        label: "Exécutés",
        activeClass:
            "bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold",
    },
    {
        value: "REJECTED" as TradeStatusFilter,
        label: "Rejetés",
        activeClass:
            "bg-white text-amber-600 shadow-xs dark:bg-slate-800 dark:text-amber-400 font-semibold",
    },
    {
        value: "FAILED" as TradeStatusFilter,
        label: "Échoués",
        activeClass:
            "bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold",
    },
];

const hasActiveFilters = computed(() => {
    return (
        tradesStore.filterStatus !== "ALL" ||
        tradesStore.filterSide !== "ALL" ||
        tradesStore.filterTargetAddress !== "ALL" ||
        tradesStore.filterMode !== "ALL" ||
        tradesStore.searchQuery.trim().length > 0
    );
});

function getWhaleName(address: string): string {
    const target = targetsStore.targets.find(
        (t) => t.address.toLowerCase() === address.toLowerCase()
    );
    return target ? target.alias : truncateAddress(address);
}

function getTypeBadge(
    side: string,
    status: string
): { label: string; variant: BadgeVariant; title?: string } {
    if (status === "REJECTED") {
        return { label: "Rejeté", variant: "warning" };
    }
    if (status === "FAILED") {
        return { label: "Échoué", variant: "danger" };
    }
    if (side === "BUY") {
        return { label: "Achat", variant: "success" };
    }
    return { label: "Vente", variant: "danger", title: "Sortie ALL répliquée" };
}

function handleSearchInput(): void {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        tradesStore.setSearch(localSearch.value);
    }, 300);
}

function handleSort(field: string): void {
    tradesStore.toggleSort(field as TradeSortField);
}

async function handleResetFilters(): Promise<void> {
    localSearch.value = "";
    await tradesStore.resetFilters();
}

onMounted(async () => {
    if (tradesStore.trades.length === 0) {
        await tradesStore.loadPage(1);
    }
});
</script>

<template>
  <div
    class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
  >
    <!-- Header -->
    <div
      class="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <div class="flex items-center flex-wrap gap-2">
          <AppIcon name="zap" :size="17" class="text-rose-500" />
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Journal d'Activité Furtif
          </h3>
          <AppBadge variant="neutral" size="xs">
            {{ tradesStore.total }} ordres
          </AppBadge>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Signaux captés, ordres répliqués et filtrages du gestionnaire de risque
        </p>
      </div>

      <AppSegmentedFilter
        :model-value="tradesStore.filterStatus"
        :options="statusOptions"
        size="xs"
        @update:model-value="(val) => tradesStore.setStatusFilter(val)"
      />
    </div>

    <!-- Barre de filtres avancés (masquable/allégée en mode compact) -->
    <div
      v-if="!props.compact"
      class="px-5 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/30 flex flex-wrap items-center gap-2.5 text-xs"
    >
      <!-- Recherche -->
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <AppIcon
          name="search"
          :size="14"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          v-model="localSearch"
          @input="handleSearchInput"
          type="text"
          placeholder="Rechercher un marché ou motif..."
          class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
        />
      </div>

      <!-- Filtre Side -->
      <select
        :value="tradesStore.filterSide"
        @change="(e) => tradesStore.setSideFilter((e.target as HTMLSelectElement).value as TradeSideFilter)"
        aria-label="Filtrer par sens"
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
      >
        <option value="ALL">Sens : Tous</option>
        <option value="BUY">Achats (BUY)</option>
        <option value="SELL">Ventes (SELL)</option>
      </select>

      <!-- Filtre Baleine -->
      <select
        :value="tradesStore.filterTargetAddress"
        @change="(e) => tradesStore.setTargetFilter((e.target as HTMLSelectElement).value)"
        aria-label="Filtrer par baleine"
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer max-w-[180px]"
      >
        <option value="ALL">Baleines : Toutes</option>
        <option v-for="t in targetsStore.targets" :key="t.id" :value="t.address">
          {{ t.alias }}
        </option>
      </select>

      <!-- Filtre Mode -->
      <select
        :value="tradesStore.filterMode"
        @change="(e) => tradesStore.setModeFilter((e.target as HTMLSelectElement).value as TradeModeFilter)"
        aria-label="Filtrer par mode"
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
      >
        <option value="ALL">Mode : Tous</option>
        <option value="DRY_RUN">Simulation</option>
        <option value="LIVE">Live CLOB</option>
      </select>

      <button
        v-if="hasActiveFilters"
        type="button"
        @click="handleResetFilters"
        class="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
      >
        <AppIcon name="rotate-ccw" :size="13" />
        <span>Réinitialiser</span>
      </button>
    </div>

    <!-- Tableau Structuré -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr
            class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
          >
            <SortableTh
              label="Date"
              field="executedAt"
              :active-field="tradesStore.sortBy"
              :sort-order="tradesStore.sortOrder"
              @sort="handleSort"
            />
            <th class="py-3 px-4 whitespace-nowrap">Type</th>
            <th class="py-3 px-4 whitespace-nowrap">Baleine</th>
            <th v-if="!props.compact" class="py-3 px-4 min-w-[200px]">Marché / Détail</th>
            <SortableTh
              v-if="!props.compact"
              label="Parts"
              field="shares"
              :active-field="tradesStore.sortBy"
              :sort-order="tradesStore.sortOrder"
              @sort="handleSort"
            />
            <SortableTh
              v-if="!props.compact"
              label="Prix"
              field="executedPrice"
              :active-field="tradesStore.sortBy"
              :sort-order="tradesStore.sortOrder"
              @sort="handleSort"
            />
            <SortableTh
              label="Montant"
              field="costUsdc"
              :active-field="tradesStore.sortBy"
              :sort-order="tradesStore.sortOrder"
              @sort="handleSort"
            />
            <SortableTh
              v-if="!props.compact"
              label="Slippage"
              field="slippagePercent"
              :active-field="tradesStore.sortBy"
              :sort-order="tradesStore.sortOrder"
              @sort="handleSort"
            />
            <th class="py-3 px-4 text-right whitespace-nowrap">Mode</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
          <tr
            v-for="trade in tradesStore.trades"
            :key="trade.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
          >
            <!-- Date -->
            <td class="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {{ props.compact ? formatTimestampTime(trade.executedAt, true) : formatTimestampDateTime(trade.executedAt) }}
            </td>

            <!-- Type / Statut -->
            <td class="py-3 px-4 whitespace-nowrap">
              <AppBadge
                :variant="getTypeBadge(trade.side, trade.status).variant"
                :title="getTypeBadge(trade.side, trade.status).title"
                size="xs"
                rounded="md"
              >
                {{ getTypeBadge(trade.side, trade.status).label }}
              </AppBadge>
            </td>

            <!-- Baleine -->
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="font-mono font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                {{ getWhaleName(trade.targetAddress) }}
              </span>
            </td>

            <!-- Marché / Motif -->
            <td v-if="!props.compact" class="py-3 px-4 max-w-[280px]">
              <div class="flex items-center gap-1.5 min-w-0">
                <a
                  v-if="trade.marketQuestion"
                  :href="getPolymarketUrl(trade)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="trade.marketQuestion"
                  class="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                >
                  {{ trade.marketQuestion }}
                </a>
                <span v-else class="text-slate-400 font-mono truncate">
                  {{ truncateAddress(trade.conditionId, 8, 6) }}
                </span>
                <AppBadge v-if="trade.outcomeLabel" variant="neutral" size="xs" rounded="md" :truncate="true">
                  {{ trade.outcomeLabel }}
                </AppBadge>
              </div>
              <div
                v-if="trade.rejectionReason"
                class="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1"
                :title="trade.rejectionReason"
              >
                <AppIcon name="shield" :size="12" class="mt-0.5 shrink-0" />
                <span class="line-clamp-1">{{ trade.rejectionReason }}</span>
              </div>
            </td>

            <!-- Parts -->
            <td v-if="!props.compact" class="py-3 px-4 font-mono whitespace-nowrap">
              {{ trade.shares.toFixed(1) }}
            </td>

            <!-- Prix -->
            <td v-if="!props.compact" class="py-3 px-4 font-mono whitespace-nowrap">
              {{ formatCurrency(trade.executedPrice, 3) }}
            </td>

            <!-- Montant -->
            <td class="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(trade.costUsdc) }}
            </td>

            <!-- Slippage -->
            <td v-if="!props.compact" class="py-3 px-4 font-mono whitespace-nowrap">
              <span
                v-if="trade.status === 'FILLED'"
                :class="
                  trade.slippagePercent > 1
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                "
              >
                {{ trade.slippagePercent >= 0 ? "+" : "" }}{{ trade.slippagePercent.toFixed(2) }}%
              </span>
              <span v-else class="text-slate-400">—</span>
            </td>

            <!-- Mode -->
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <AppBadge
                :variant="trade.isDryRun ? 'warning' : 'success'"
                size="xs"
                rounded="md"
              >
                {{ trade.isDryRun ? "Simu" : "Live" }}
              </AppBadge>
            </td>
          </tr>

          <tr v-if="tradesStore.isLoading && tradesStore.trades.length === 0">
            <td :colspan="props.compact ? 5 : 9" class="py-10 text-center text-slate-400">
              <span class="inline-flex items-center gap-2 text-xs">
                <AppIcon name="refresh-cw" :size="14" class="animate-spin" />
                Chargement du journal...
              </span>
            </td>
          </tr>

          <tr v-if="!tradesStore.isLoading && tradesStore.trades.length === 0">
            <td :colspan="props.compact ? 5 : 9">
              <AppEmptyState
                icon="zap"
                title="Aucune activité trouvée"
                :description="
                  hasActiveFilters
                    ? 'Aucun ordre ne correspond aux filtres sélectionnés.'
                    : 'Lotso surveille les portefeuilles cibles en tâche de fond.'
                "
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <AppPagination
      v-if="tradesStore.total > 0"
      :page="tradesStore.page"
      :page-size="tradesStore.pageSize"
      :total-items="tradesStore.total"
      :total-pages="tradesStore.totalPages"
      item-label="ordres"
      @update:page="(p) => tradesStore.setPage(p)"
      @update:page-size="(s) => tradesStore.setPageSize(s)"
    />
  </div>
</template>
