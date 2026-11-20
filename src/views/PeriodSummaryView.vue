<script setup lang="ts">
import type { PeriodGranularity, PeriodSortField, PeriodSummaryItem } from "@lotso-trading/shared";
import { computed, onMounted, ref } from "vue";
import AppBadge from "../components/ui/AppBadge.vue";
import AppEmptyState from "../components/ui/AppEmptyState.vue";
import AppIcon from "../components/ui/AppIcon.vue";
import AppPageHeader from "../components/ui/AppPageHeader.vue";
import AppPagination from "../components/ui/AppPagination.vue";
import AppSegmentedFilter from "../components/ui/AppSegmentedFilter.vue";
import SortableTh from "../components/ui/SortableTh.vue";
import StatKpiCard from "../components/ui/StatKpiCard.vue";
import { usePeriodSummaryStore } from "../stores/use-period-summary.store.ts";
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "../utils/formatters.ts";

const store = usePeriodSummaryStore();
const hoveredBar = ref<PeriodSummaryItem | null>(null);

const granularityOptions = [
    { value: "day" as PeriodGranularity, label: "Par jour", icon: "calendar" as const },
    { value: "week" as PeriodGranularity, label: "Par semaine", icon: "calendar-range" as const },
    { value: "month" as PeriodGranularity, label: "Par mois", icon: "bar-chart" as const },
    { value: "year" as PeriodGranularity, label: "Par an", icon: "landmark" as const },
];

const granularityTitle = computed(() => {
    switch (store.granularity) {
        case "day":
            return "jour";
        case "week":
            return "semaine";
        case "month":
            return "mois";
        case "year":
            return "an";
    }
});

// Données du graphique en barres (ordre chronologique croissant sur la page affichée, max 20 barres)
const chartBars = computed(() => {
    return [...store.items].sort((a, b) => a.periodKey.localeCompare(b.periodKey));
});

const chartMaxAbs = computed(() => {
    const maxVal = chartBars.value.reduce((acc, item) => Math.max(acc, Math.abs(item.netPnl)), 0);
    return maxVal > 0 ? maxVal * 1.15 : 10;
});

const chartWidth = 860;
const chartHeight = 200;
const chartPad = { top: 20, right: 20, bottom: 32, left: 60 };
const innerW = chartWidth - chartPad.left - chartPad.right;
const innerH = chartHeight - chartPad.top - chartPad.bottom;
const zeroY = chartPad.top + innerH / 2;

function getBarRect(item: PeriodSummaryItem, index: number, total: number) {
    const slotW = innerW / Math.max(1, total);
    const barW = Math.min(38, Math.max(8, slotW * 0.62));
    const x = chartPad.left + index * slotW + (slotW - barW) / 2;
    const ratio = item.netPnl / chartMaxAbs.value;
    const h = Math.max(2, Math.abs(ratio) * (innerH / 2));
    const y = item.netPnl >= 0 ? zeroY - h : zeroY;
    return { x, y, width: barW, height: h, centerX: x + barW / 2 };
}

function handleSort(field: string): void {
    store.toggleSort(field as PeriodSortField);
}

onMounted(async () => {
    await store.loadPage(1);
});
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <AppPageHeader
      title="Bilans Périodiques"
      subtitle="Récapitulatif chronologique de vos performances par jour, semaine, mois ou année"
      icon="calendar-range"
    >
      <template #badges>
        <AppBadge variant="info" size="sm">
          {{ store.total }} {{ store.total > 1 ? "périodes" : "période" }}
        </AppBadge>
      </template>

      <template #actions>
        <AppSegmentedFilter
          :model-value="store.granularity"
          :options="granularityOptions"
          size="sm"
          @update:model-value="(val) => store.setGranularity(val)"
        />
      </template>
    </AppPageHeader>

    <!-- 4 KPIs synthétiques -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatKpiCard
        label="Bénéfice Net Cumulé"
        icon="scale"
        :value="formatSignedCurrency(store.totals.netPnl)"
        :value-class="
          store.totals.netPnl >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        "
        :badge-text="formatSignedPercent(store.totals.roiPercent)"
        :badge-variant="store.totals.netPnl >= 0 ? 'success' : 'danger'"
        :subtitle="`Sur ${formatCurrency(store.totals.totalInvested)} misés`"
      />

      <StatKpiCard
        :label="`Moyenne / ${granularityTitle}`"
        icon="bar-chart"
        icon-class="text-blue-500"
        :value="formatSignedCurrency(store.avgNetPnlPerPeriod)"
        :value-class="
          store.avgNetPnlPerPeriod >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        "
        :subtitle="`${store.totals.count} marché(s) clôturé(s) au total`"
      />

      <StatKpiCard
        label="Meilleure Période"
        icon="trophy"
        icon-class="text-emerald-500"
        :value="store.bestPeriod ? formatSignedCurrency(store.bestPeriod.netPnl) : '—'"
        value-class="text-emerald-600 dark:text-emerald-400"
        :subtitle="store.bestPeriod ? store.bestPeriod.periodLabel : 'Aucune clôture'"
      />

      <StatKpiCard
        label="Taux de Victoire Global"
        icon="target"
        icon-class="text-rose-500"
        :value="`${store.totals.winRate.toFixed(1)}%`"
        :badge-text="`${store.totals.winCount}W / ${store.totals.lossCount}L`"
        :badge-variant="store.totals.winRate >= 50 ? 'success' : 'danger'"
        :subtitle="store.worstPeriod ? `Pire : ${store.worstPeriod.periodLabel} (${formatSignedCurrency(store.worstPeriod.netPnl)})` : 'En attente de résultats'"
      />
    </div>

    <!-- Graphique SVG en barres (PnL net par période) -->
    <div
      v-if="chartBars.length > 0"
      class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs transition-colors"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-2">
          <AppIcon name="bar-chart" :size="15" class="text-rose-500" />
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            Évolution du PnL Net ({{ granularityTitle }})
          </h3>
        </div>
        <div
          v-if="hoveredBar"
          class="text-xs font-mono flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <span class="font-semibold text-slate-800 dark:text-slate-200">{{ hoveredBar.periodLabel }}</span>
          <span
            class="font-bold"
            :class="hoveredBar.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ formatSignedCurrency(hoveredBar.netPnl) }}
          </span>
          <span class="text-slate-400">({{ hoveredBar.winCount }}W-{{ hoveredBar.lossCount }}L)</span>
        </div>
      </div>

      <div class="w-full overflow-x-auto" @mouseleave="hoveredBar = null">
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full min-w-[540px] h-48 font-mono select-none">
          <!-- Ligne zéro -->
          <line
            :x1="chartPad.left"
            :y1="zeroY"
            :x2="chartWidth - chartPad.right"
            :y2="zeroY"
            class="stroke-slate-300 dark:stroke-slate-700"
            stroke-width="1"
          />
          <!-- Repères haut / bas -->
          <line
            :x1="chartPad.left"
            :y1="chartPad.top"
            :x2="chartWidth - chartPad.right"
            :y2="chartPad.top"
            class="stroke-slate-200 dark:stroke-slate-800"
            stroke-dasharray="3,3"
            stroke-width="1"
          />
          <line
            :x1="chartPad.left"
            :y1="chartHeight - chartPad.bottom"
            :x2="chartWidth - chartPad.right"
            :y2="chartHeight - chartPad.bottom"
            class="stroke-slate-200 dark:stroke-slate-800"
            stroke-dasharray="3,3"
            stroke-width="1"
          />

          <text :x="chartPad.left - 8" :y="chartPad.top + 4" text-anchor="end" class="text-[10px] fill-slate-400">
            +${{ chartMaxAbs.toFixed(0) }}
          </text>
          <text :x="chartPad.left - 8" :y="zeroY + 3" text-anchor="end" class="text-[10px] fill-slate-400">
            $0
          </text>
          <text :x="chartPad.left - 8" :y="chartHeight - chartPad.bottom + 3" text-anchor="end" class="text-[10px] fill-slate-400">
            -${{ chartMaxAbs.toFixed(0) }}
          </text>

          <g v-for="(item, idx) in chartBars" :key="item.periodKey">
            <rect
              :x="getBarRect(item, idx, chartBars.length).x"
              :y="getBarRect(item, idx, chartBars.length).y"
              :width="getBarRect(item, idx, chartBars.length).width"
              :height="getBarRect(item, idx, chartBars.length).height"
              rx="3"
              class="cursor-pointer transition-opacity"
              :class="[
                item.netPnl >= 0
                  ? 'fill-emerald-500/80 hover:fill-emerald-500'
                  : 'fill-rose-500/80 hover:fill-rose-500',
                hoveredBar && hoveredBar.periodKey !== item.periodKey ? 'opacity-50' : 'opacity-100',
              ]"
              @mouseenter="hoveredBar = item"
            />
            <text
              v-if="chartBars.length <= 12 || idx % Math.ceil(chartBars.length / 8) === 0"
              :x="getBarRect(item, idx, chartBars.length).centerX"
              :y="chartHeight - 10"
              text-anchor="middle"
              class="text-[9px] fill-slate-400"
            >
              {{ item.periodKey }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Tableau détaillé paginé -->
    <div
      class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
            >
              <SortableTh
                label="Période"
                field="period"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                @sort="handleSort"
              />
              <SortableTh
                label="Clôtures"
                field="count"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                @sort="handleSort"
              />
              <th class="py-3 px-4 whitespace-nowrap">Trades</th>
              <th class="py-3 px-4 whitespace-nowrap">W / L</th>
              <SortableTh
                label="Win Rate"
                field="winRate"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                @sort="handleSort"
              />
              <SortableTh
                label="Mises"
                field="totalInvested"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                @sort="handleSort"
              />
              <th class="py-3 px-4 whitespace-nowrap">Payout</th>
              <SortableTh
                label="PnL Net"
                field="netPnl"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                @sort="handleSort"
              />
              <SortableTh
                label="ROI"
                field="roiPercent"
                :active-field="store.sortBy"
                :sort-order="store.sortOrder"
                align="right"
                @sort="handleSort"
              />
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
            <tr
              v-for="row in store.items"
              :key="row.periodKey"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
            >
              <td class="py-3.5 px-4 font-sans whitespace-nowrap">
                <div class="font-semibold text-slate-900 dark:text-white">
                  {{ row.periodLabel }}
                </div>
                <div class="text-[10px] font-mono text-slate-400">
                  {{ row.periodKey }}
                </div>
              </td>

              <td class="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {{ row.count }}
              </td>

              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {{ row.tradesCount }}
              </td>

              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ row.winCount }}W</span>
                <span class="text-slate-400 mx-1">/</span>
                <span class="text-rose-600 dark:text-rose-400 font-semibold">{{ row.lossCount }}L</span>
              </td>

              <td class="py-3.5 px-4 whitespace-nowrap">
                <AppBadge
                  :variant="row.count === 0 ? 'neutral' : row.winRate >= 50 ? 'success' : 'danger'"
                  size="xs"
                >
                  {{ row.winRate.toFixed(1) }}%
                </AppBadge>
              </td>

              <td class="py-3.5 px-4 whitespace-nowrap">
                {{ formatCurrency(row.totalInvested) }}
              </td>

              <td class="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(row.totalPayout) }}
              </td>

              <td
                class="py-3.5 px-4 font-bold whitespace-nowrap"
                :class="
                  row.netPnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                "
              >
                {{ formatSignedCurrency(row.netPnl) }}
              </td>

              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <AppBadge
                  :variant="row.roiPercent >= 0 ? 'success' : 'danger'"
                  size="xs"
                >
                  {{ formatSignedPercent(row.roiPercent) }}
                </AppBadge>
              </td>
            </tr>

            <tr v-if="store.isLoading && store.items.length === 0">
              <td colspan="9" class="py-12 text-center text-slate-400 font-sans">
                <span class="inline-flex items-center gap-2 text-xs">
                  <AppIcon name="refresh-cw" :size="14" class="animate-spin" />
                  Agrégation des bilans en cours...
                </span>
              </td>
            </tr>

            <tr v-if="!store.isLoading && store.items.length === 0">
              <td colspan="9">
                <AppEmptyState
                  icon="calendar-range"
                  title="Aucune donnée sur cette granularité"
                  description="Les bilans périodiques apparaîtront dès que des trades ou positions seront enregistrés."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppPagination
        :page="store.page"
        :page-size="store.pageSize"
        :total-items="store.total"
        :total-pages="store.totalPages"
        item-label="périodes"
        @update:page="(p) => store.setPage(p)"
        @update:page-size="(s) => store.setPageSize(s)"
      />
    </div>
  </div>
</template>
