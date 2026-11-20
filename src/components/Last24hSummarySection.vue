<script setup lang="ts">
import { computed, onMounted } from "vue";
import {
    type PositionFilterStatus,
    type TimeWindowScope,
    useLast24hSummaryStore,
} from "../stores/use-last-24h-summary.store.ts";
import { getClosedPositionOutcome } from "../utils/closed-outcome.ts";
import {
    formatCurrency,
    formatSignedCurrency,
    formatTimestampDateTime,
} from "../utils/formatters.ts";
import { getPolymarketUrl } from "../utils/polymarket-url.ts";
import AppBadge from "./ui/AppBadge.vue";
import AppEmptyState from "./ui/AppEmptyState.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPagination from "./ui/AppPagination.vue";
import AppSegmentedFilter from "./ui/AppSegmentedFilter.vue";

const props = withDefaults(
    defineProps<{
        hideKpis?: boolean;
    }>(),
    {
        hideKpis: false,
    }
);

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL") => void>();

const store = useLast24hSummaryStore();

const windowOptions = computed(() => [
    { value: "24H" as TimeWindowScope, label: "24h", icon: "zap" as const },
    { value: "ALL_TIME" as TimeWindowScope, label: "Tout", icon: "globe" as const },
]);

const activeWindowTotals = computed(() =>
    store.timeWindow === "24H" ? store.totals24h : store.totalsAll
);

const statusOptions = computed(() => [
    {
        value: "ALL" as PositionFilterStatus,
        label: "Tous",
        count: activeWindowTotals.value.count || store.total,
    },
    {
        value: "WIN" as PositionFilterStatus,
        label: "Victoires",
        count: activeWindowTotals.value.winCount,
        activeClass:
            "bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold",
    },
    {
        value: "LOSS" as PositionFilterStatus,
        label: "Défaites",
        count: activeWindowTotals.value.lossCount,
        activeClass:
            "bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold",
    },
]);

onMounted(async () => {
    await store.loadPage(1, "24H", "ALL");
});
</script>

<template>
  <div
    class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
  >
    <!-- En-tête -->
    <div
      class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
    >
      <div>
        <div class="flex items-center flex-wrap gap-2">
          <AppIcon name="zap" :size="16" class="text-rose-500" />
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ store.timeWindow === "24H" ? "Résolutions des 24 Dernières Heures" : "Historique des Résolutions" }}
          </h4>
          <AppBadge variant="success" size="xs">
            {{ store.total }} {{ store.total > 1 ? "marchés" : "marché" }}
          </AppBadge>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{
            store.timeWindow === "24H"
              ? "Marchés résolus par l'oracle Polymarket sur les dernières 24 heures"
              : "Historique complet des résolutions paginé"
          }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <AppSegmentedFilter
          :model-value="store.timeWindow"
          :options="windowOptions"
          size="xs"
          @update:model-value="(val) => store.setTimeWindow(val)"
        />

        <AppSegmentedFilter
          :model-value="store.filterStatus"
          :options="statusOptions"
          size="xs"
          @update:model-value="(val) => store.setFilterStatus(val)"
        />

        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <AppIcon name="scroll-text" :size="13" />
          <span>Journal complet</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- Tableau -->
    <div v-if="store.items.length > 0" class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr
            class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
          >
            <th class="py-3 px-6">Marché Résolu</th>
            <th class="py-3 px-4 whitespace-nowrap">Issue</th>
            <th class="py-3 px-4 whitespace-nowrap">Parts</th>
            <th class="py-3 px-4 whitespace-nowrap">Mise</th>
            <th class="py-3 px-4 whitespace-nowrap">Payout</th>
            <th class="py-3 px-4 whitespace-nowrap">Gain Net</th>
            <th class="py-3 px-6 text-right whitespace-nowrap">Résultat</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
          <tr
            v-for="pos in store.items"
            :key="pos.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
          >
            <td class="py-3 px-6 font-sans max-w-[300px]">
              <a
                :href="getPolymarketUrl(pos)"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 max-w-full"
                :title="pos.marketQuestion"
              >
                <span class="truncate">{{ pos.marketQuestion }}</span>
                <AppIcon name="arrow-up-right" :size="12" class="text-slate-400 shrink-0" />
              </a>
              <span class="text-[11px] text-slate-400 font-sans block mt-0.5 whitespace-nowrap">
                Clôturé le {{ formatTimestampDateTime(pos.closedAt || pos.updatedAt) }}
              </span>
            </td>

            <td class="py-3 px-4 font-sans whitespace-nowrap">
              <AppBadge variant="info" size="xs" rounded="md" :truncate="true" :title="pos.outcomeLabel">
                {{ pos.outcomeLabel }}
              </AppBadge>
            </td>

            <td class="py-3 px-4 text-slate-900 dark:text-white whitespace-nowrap">
              {{ pos.totalShares.toFixed(2) }}
            </td>

            <td class="py-3 px-4 whitespace-nowrap">
              {{ formatCurrency(pos.totalInvestedUsdc) }}
            </td>

            <td class="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(pos.settledPayoutUsdc) }}
            </td>

            <td
              class="py-3 px-4 font-bold whitespace-nowrap"
              :class="
                (pos.realizedPnlUsdc ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
            >
              {{ formatSignedCurrency(pos.realizedPnlUsdc) }}
            </td>

            <td class="py-3 px-6 text-right font-sans whitespace-nowrap">
              <AppBadge
                :variant="getClosedPositionOutcome(pos).variant"
                :icon="getClosedPositionOutcome(pos).icon"
                size="xs"
              >
                {{ getClosedPositionOutcome(pos).label }}
              </AppBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Chargement -->
    <div
      v-else-if="store.isLoading"
      class="py-12 text-center text-xs text-slate-500 dark:text-slate-400 inline-flex items-center justify-center gap-2 w-full"
    >
      <AppIcon name="refresh-cw" :size="15" class="animate-spin" />
      <span>Chargement des résolutions...</span>
    </div>

    <!-- État vide -->
    <AppEmptyState
      v-else
      icon="zap"
      :title="
        store.timeWindow === '24H'
          ? 'Aucune position clôturée sur les 24 dernières heures'
          : 'Aucune position trouvée pour ce filtre'
      "
      :description="
        store.timeWindow === '24H'
          ? 'Les marchés résolus par Polymarket apparaîtront automatiquement ici.'
          : 'Modifiez les filtres pour afficher d\'autres positions.'
      "
    >
      <template #actions>
        <button
          v-if="store.timeWindow === '24H'"
          type="button"
          @click="store.setTimeWindow('ALL_TIME')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
        >
          <AppIcon name="globe" :size="14" />
          <span>Voir tout l'historique</span>
        </button>
        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          <AppIcon name="scroll-text" :size="14" />
          <span>Ouvrir le Journal Clôturé</span>
        </button>
      </template>
    </AppEmptyState>

    <!-- Pagination -->
    <AppPagination
      v-if="store.total > 0"
      :page="store.page"
      :page-size="store.pageSize"
      :total-items="store.total"
      :total-pages="store.totalPages"
      item-label="résolutions"
      @update:page="(p) => store.setPage(p)"
      @update:page-size="(s) => store.setPageSize(s)"
    />
  </div>
</template>
