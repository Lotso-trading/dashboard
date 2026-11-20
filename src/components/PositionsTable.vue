<script setup lang="ts">
import type { SortOrder } from "@lotso-trading/shared";
import { computed, onMounted, ref } from "vue";
import { usePagination } from "../composables/use-pagination.ts";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import {
    formatCurrency,
    formatLocalIsoDate,
    formatSignedCurrency,
    formatTimestampTime,
    formatUtcIsoDate,
    getRelativeExpiry,
} from "../utils/formatters.ts";
import { getPolymarketUrl } from "../utils/polymarket-url.ts";
import AppBadge from "./ui/AppBadge.vue";
import AppEmptyState from "./ui/AppEmptyState.vue";
import AppIcon from "./ui/AppIcon.vue";
import AppPagination from "./ui/AppPagination.vue";
import AppSegmentedFilter from "./ui/AppSegmentedFilter.vue";
import SortableTh from "./ui/SortableTh.vue";
import StatKpiCard from "./ui/StatKpiCard.vue";

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL") => void>();

const positionsStore = usePositionsStore();
const last24hStore = useLast24hSummaryStore();
const metricsStore = useMetricsStore();

const viewMode = ref<"CARDS" | "TABLE">("CARDS");
const syncMessage = ref<string | null>(null);
const syncTone = ref<"info" | "warning">("info");

export type OpenPositionSortField = "expiry" | "invested" | "payout" | "currentValue" | "openedAt";

const sortField = ref<OpenPositionSortField>("expiry");
const sortOrder = ref<SortOrder>("asc");

const viewOptions = [
    { value: "CARDS" as const, label: "Cartes", icon: "layout-grid" as const },
    { value: "TABLE" as const, label: "Tableau", icon: "table" as const },
];

const sortSelectOptions: { value: OpenPositionSortField; label: string }[] = [
    { value: "expiry", label: "Échéance" },
    { value: "invested", label: "Mise engagée" },
    { value: "payout", label: "Gain potentiel" },
    { value: "currentValue", label: "Valeur carnet" },
    { value: "openedAt", label: "Date d'ouverture" },
];

const lastRefreshedLabel = computed(() => {
    return formatTimestampTime(positionsStore.lastRefreshedAt ?? Date.now(), true);
});

const netPotentialProfitUsdc = computed(() => {
    return Math.max(0, positionsStore.totalPayoutPotentialUsdc - positionsStore.totalInvestedUsdc);
});

const closedCount = computed(() => {
    return last24hStore.totalsAll.count || positionsStore.closedPositions.length;
});

const realizedPnlAll = computed(() => {
    return typeof metricsStore.metrics.realizedPnlUsdc === "number"
        ? metricsStore.metrics.realizedPnlUsdc
        : last24hStore.totalsAll.netPnl;
});

function getEndDateTimestamp(isoDate?: string): number {
    if (!isoDate) return Number.POSITIVE_INFINITY;
    const time = new Date(isoDate).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

const sortedOpenPositions = computed(() => {
    const dir = sortOrder.value === "asc" ? 1 : -1;
    return [...positionsStore.positions].sort((a, b) => {
        if (sortField.value === "expiry") {
            const timeA = getEndDateTimestamp(a.endDate);
            const timeB = getEndDateTimestamp(b.endDate);
            if (timeA === Number.POSITIVE_INFINITY && timeB === Number.POSITIVE_INFINITY) return 0;
            if (timeA === Number.POSITIVE_INFINITY) return 1;
            if (timeB === Number.POSITIVE_INFINITY) return -1;
            if (timeA !== timeB) return (timeA - timeB) * dir;
            return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
        }

        let cmp = 0;
        switch (sortField.value) {
            case "invested":
                cmp = (a.totalInvestedUsdc || 0) - (b.totalInvestedUsdc || 0);
                break;
            case "payout": {
                const profitA = Math.max(0, (a.totalShares || 0) - (a.totalInvestedUsdc || 0));
                const profitB = Math.max(0, (b.totalShares || 0) - (b.totalInvestedUsdc || 0));
                cmp = profitA - profitB;
                break;
            }
            case "currentValue":
                cmp = (a.currentMarketValueUsdc || 0) - (b.currentMarketValueUsdc || 0);
                break;
            case "openedAt":
                cmp = (a.openedAt || 0) - (b.openedAt || 0);
                break;
        }
        return cmp * dir;
    });
});

const { page, pageSize, totalItems, totalPages, paginatedItems, setPage, setPageSize } =
    usePagination(sortedOpenPositions);

function handleSort(field: string): void {
    const typed = field as OpenPositionSortField;
    if (sortField.value === typed) {
        sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    } else {
        sortField.value = typed;
        sortOrder.value = typed === "expiry" ? "asc" : "desc";
    }
    setPage(1);
}

function toggleSortOrder(): void {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    setPage(1);
}

async function handleSyncAndRefresh(): Promise<void> {
    const res = await positionsStore.requestBotSyncAndRefresh();
    await Promise.all([metricsStore.fetchMetrics(), last24hStore.loadClosedSummaries()]);
    syncMessage.value = res.message;
    syncTone.value = res.botOnline ? "info" : "warning";
    setTimeout(() => {
        if (syncMessage.value === res.message) {
            syncMessage.value = null;
        }
    }, 5000);
}

onMounted(async () => {
    await Promise.all([positionsStore.fetchPositions(), last24hStore.loadClosedSummaries()]);
});
</script>

<template>
  <div
    class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
  >
    <!-- Barre d'actions supérieure -->
    <div
      class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
    >
      <div>
        <div class="flex items-center flex-wrap gap-2.5">
          <AppIcon name="layers" :size="18" class="text-rose-500" />
          <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Positions Infiltrées Ouvertes
          </h3>
          <AppBadge variant="brand" size="xs">
            {{ positionsStore.positions.length }} actives
          </AppBadge>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Suivi en direct des parts détenues · Dernier rafraîchissement :
          <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">{{ lastRefreshedLabel }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="handleSyncAndRefresh"
          :disabled="positionsStore.isSettling"
          class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <AppIcon
            name="refresh-cw"
            :size="13"
            :class="{ 'animate-spin': positionsStore.isSettling }"
          />
          <span>{{ positionsStore.isSettling ? "Actualisation..." : "Actualiser & Vérifier" }}</span>
        </button>

        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <AppIcon name="scroll-text" :size="13" />
          <span>Journal Clôturé ({{ closedCount }})</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>

        <AppSegmentedFilter v-model="viewMode" :options="viewOptions" size="xs" />
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Notification de synchronisation -->
      <div
        v-if="syncMessage"
        :class="[
          'rounded-xl px-4 py-2.5 text-xs flex items-center justify-between gap-2 border',
          syncTone === 'info'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
        ]"
      >
        <div class="flex items-center gap-2">
          <AppIcon :name="syncTone === 'info' ? 'check-circle' : 'alert-triangle'" :size="14" />
          <span>{{ syncMessage }}</span>
        </div>
        <button
          type="button"
          @click="syncMessage = null"
          class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          aria-label="Fermer"
        >
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <!-- 4 KPIs synthétiques -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatKpiCard
          label="Capital Engagé"
          icon="briefcase"
          icon-class="text-blue-500"
          :value="formatCurrency(positionsStore.totalInvestedUsdc)"
          :subtitle="`${positionsStore.positions.length} position(s) ouverte(s)`"
        />

        <StatKpiCard
          label="Gains Max Garantis"
          icon="trophy"
          icon-class="text-emerald-500"
          :value="formatCurrency(positionsStore.totalPayoutPotentialUsdc)"
          value-class="text-emerald-700 dark:text-emerald-400"
          border-class="border-emerald-200 dark:border-emerald-500/25"
          :subtitle="`Gain net potentiel max : +${formatCurrency(netPotentialProfitUsdc)}`"
        />

        <StatKpiCard
          label="PnL Réalisé (Clôturé)"
          icon="coins"
          icon-class="text-emerald-500"
          :value="formatSignedCurrency(realizedPnlAll)"
          :value-class="
            realizedPnlAll >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          "
          :subtitle="`${closedCount} position(s) archivée(s)`"
        />

        <StatKpiCard
          label="Valeur Carnet"
          icon="clock"
          icon-class="text-amber-500"
          :value="formatCurrency(positionsStore.totalPositionsValueUsdc)"
          :subtitle="`Écart carnet : ${formatSignedCurrency(positionsStore.totalUnrealizedPnlUsdc)}`"
        />
      </div>

      <!-- Barre de tri -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {{ sortedOpenPositions.length }} position(s) en portefeuille
        </div>

        <div class="flex items-center gap-1.5 text-xs">
          <select
            v-model="sortField"
            @change="setPage(1)"
            aria-label="Trier les positions ouvertes"
            class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option v-for="opt in sortSelectOptions" :key="opt.value" :value="opt.value">
              Tri : {{ opt.label }}
            </option>
          </select>

          <button
            type="button"
            @click="toggleSortOrder"
            class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
          >
            <AppIcon :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" :size="13" />
            <span>{{ sortOrder === "asc" ? "ASC" : "DESC" }}</span>
          </button>
        </div>
      </div>

      <!-- VUE CARTES -->
      <div v-if="viewMode === 'CARDS'">
        <div v-if="paginatedItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="position in paginatedItems"
            :key="position.id"
            class="bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.07] rounded-2xl p-5 space-y-4 transition flex flex-col justify-between shadow-xs"
          >
            <!-- Top Row -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <AppBadge
                  :variant="position.outcomeLabel.toLowerCase() === 'yes' ? 'success' : 'danger'"
                  size="sm"
                  :truncate="true"
                  :title="position.outcomeLabel"
                >
                  {{ position.outcomeLabel }}
                </AppBadge>
                <span class="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                  {{ formatCurrency(position.avgEntryPrice, 3) }} ({{ (position.avgEntryPrice * 100).toFixed(0) }}%)
                </span>
              </div>

              <a
                :href="getPolymarketUrl(position)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 inline-flex items-center gap-1 font-mono transition shrink-0 bg-white dark:bg-white/[0.03] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.06]"
              >
                <span>Polymarket</span>
                <AppIcon name="arrow-up-right" :size="12" />
              </a>
            </div>

            <!-- Question -->
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
              {{ position.marketQuestion }}
            </h4>

            <!-- Barre de progression vers 1.00$ -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>Entrée : {{ formatCurrency(position.avgEntryPrice) }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Cible : $1.00</span>
              </div>
              <div class="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  class="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, Math.max(8, position.avgEntryPrice * 100))}%` }"
                />
              </div>
            </div>

            <!-- Échéance -->
            <div
              class="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/[0.05] rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs"
            >
              <div
                class="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] min-w-0 truncate"
                :title="formatUtcIsoDate(position.endDate) ? `UTC : ${formatUtcIsoDate(position.endDate)}` : ''"
              >
                <AppIcon name="calendar" :size="13" class="text-slate-400" />
                <span class="font-medium truncate">{{ formatLocalIsoDate(position.endDate) }}</span>
              </div>
              <AppBadge
                :variant="getRelativeExpiry(position.endDate).tone"
                icon="clock"
                size="xs"
              >
                {{ getRelativeExpiry(position.endDate).label }}
              </AppBadge>
            </div>

            <!-- Synthèse financière -->
            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <div class="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] rounded-xl p-3">
                <div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mise Engagée</div>
                <div class="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {{ formatCurrency(position.totalInvestedUsdc) }}
                </div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {{ position.totalShares.toFixed(1) }} parts
                </div>
              </div>

              <div
                class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3"
              >
                <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                  Si Victoire
                </div>
                <div class="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {{ formatCurrency(position.totalShares) }}
                </div>
                <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold whitespace-nowrap">
                  +{{ formatCurrency(Math.max(0, position.totalShares - position.totalInvestedUsdc)) }}
                  (+{{ (((position.totalShares - position.totalInvestedUsdc) / (position.totalInvestedUsdc || 1)) * 100).toFixed(0) }}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        <AppEmptyState
          v-else
          icon="layers"
          title="Aucune position ouverte pour le moment"
          description="Dès qu'une baleine suivie passe un ordre validé, votre position s'affichera ici."
        />
      </div>

      <!-- VUE TABLEAU OUVERTE (Réparée, alignée, responsive) -->
      <div
        v-else
        class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0B0E14]/40"
      >
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
            >
              <th class="py-3 px-4 min-w-[240px]">Marché</th>
              <th class="py-3 px-4 whitespace-nowrap">Issue</th>
              <SortableTh
                label="Échéance"
                field="expiry"
                :active-field="sortField"
                :sort-order="sortOrder"
                @sort="handleSort"
              />
              <th class="py-3 px-4 whitespace-nowrap">Parts / Cote</th>
              <SortableTh
                label="Mise"
                field="invested"
                :active-field="sortField"
                :sort-order="sortOrder"
                @sort="handleSort"
              />
              <SortableTh
                label="Carnet"
                field="currentValue"
                :active-field="sortField"
                :sort-order="sortOrder"
                @sort="handleSort"
              />
              <SortableTh
                label="Si Victoire"
                field="payout"
                :active-field="sortField"
                :sort-order="sortOrder"
                align="right"
                @sort="handleSort"
              />
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-200">
            <tr
              v-for="position in paginatedItems"
              :key="position.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/25 transition"
            >
              <!-- Marché -->
              <td class="py-3.5 px-4 max-w-[280px]">
                <a
                  :href="getPolymarketUrl(position)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="position.marketQuestion"
                  class="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 max-w-full"
                >
                  <span class="truncate">{{ position.marketQuestion }}</span>
                  <AppIcon name="arrow-up-right" :size="12" class="text-slate-400 shrink-0" />
                </a>
              </td>

              <!-- Issue -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <AppBadge
                  :variant="position.outcomeLabel.toLowerCase() === 'yes' ? 'success' : 'danger'"
                  size="xs"
                  :truncate="true"
                  :title="position.outcomeLabel"
                >
                  {{ position.outcomeLabel }}
                </AppBadge>
              </td>

              <!-- Échéance -->
              <td class="py-3.5 px-4 font-mono whitespace-nowrap">
                <div class="flex flex-col items-start gap-1">
                  <span
                    class="text-slate-800 dark:text-slate-200 text-[11px]"
                    :title="formatUtcIsoDate(position.endDate) ? `UTC : ${formatUtcIsoDate(position.endDate)}` : ''"
                  >
                    {{ formatLocalIsoDate(position.endDate) }}
                  </span>
                  <AppBadge
                    :variant="getRelativeExpiry(position.endDate).tone"
                    icon="clock"
                    size="xs"
                  >
                    {{ getRelativeExpiry(position.endDate).label }}
                  </AppBadge>
                </div>
              </td>

              <!-- Parts / Cote -->
              <td class="py-3.5 px-4 font-mono whitespace-nowrap">
                <div class="font-semibold text-slate-900 dark:text-white">
                  {{ position.totalShares.toFixed(1) }} parts
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatCurrency(position.avgEntryPrice, 3) }} ({{ (position.avgEntryPrice * 100).toFixed(0) }}%)
                </div>
              </td>

              <!-- Mise -->
              <td class="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(position.totalInvestedUsdc) }}
              </td>

              <!-- Carnet -->
              <td class="py-3.5 px-4 font-mono whitespace-nowrap">
                <div class="font-semibold text-slate-800 dark:text-slate-200">
                  {{ formatCurrency(position.currentMarketValueUsdc) }}
                </div>
                <div
                  class="text-[11px]"
                  :class="
                    position.unrealizedPnlUsdc >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  "
                >
                  {{ formatSignedCurrency(position.unrealizedPnlUsdc) }}
                </div>
              </td>

              <!-- Si Victoire (compact, sans carte imbriquée cassée) -->
              <td class="py-3.5 px-4 font-mono text-right whitespace-nowrap">
                <div class="font-bold text-emerald-700 dark:text-emerald-300">
                  {{ formatCurrency(position.totalShares) }}
                </div>
                <div class="inline-flex items-center justify-end gap-1.5 mt-0.5">
                  <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    +{{ formatCurrency(Math.max(0, position.totalShares - position.totalInvestedUsdc)) }}
                  </span>
                  <AppBadge variant="success" size="xs" rounded="md">
                    +{{ (((position.totalShares - position.totalInvestedUsdc) / (position.totalInvestedUsdc || 1)) * 100).toFixed(0) }}%
                  </AppBadge>
                </div>
              </td>
            </tr>

            <tr v-if="paginatedItems.length === 0">
              <td colspan="7">
                <AppEmptyState
                  icon="layers"
                  title="Aucune position ouverte actuellement"
                  description="Les positions actives apparaîtront dès la prochaine réplication."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination globale (20 par page, ajustable) -->
    <AppPagination
      v-if="totalItems > 0"
      :page="page"
      :page-size="pageSize"
      :total-items="totalItems"
      :total-pages="totalPages"
      item-label="positions ouvertes"
      @update:page="setPage"
      @update:page-size="setPageSize"
    />
  </div>
</template>
