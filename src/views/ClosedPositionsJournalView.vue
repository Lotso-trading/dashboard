<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppBadge from "../components/ui/AppBadge.vue";
import AppEmptyState from "../components/ui/AppEmptyState.vue";
import AppIcon from "../components/ui/AppIcon.vue";
import AppPageHeader from "../components/ui/AppPageHeader.vue";
import AppPagination from "../components/ui/AppPagination.vue";
import AppSegmentedFilter from "../components/ui/AppSegmentedFilter.vue";
import StatKpiCard from "../components/ui/StatKpiCard.vue";
import { useClosedJournalStore } from "../stores/use-closed-journal.store.ts";
import { getClosedPositionOutcome } from "../utils/closed-outcome.ts";
import {
    formatCurrency,
    formatSignedCurrency,
    formatSignedPercent,
    formatTimestampDateTime,
} from "../utils/formatters.ts";
import { getPolymarketUrl } from "../utils/polymarket-url.ts";

const emit = defineEmits<(e: "navigate", tab: "SYNTHESIS") => void>();

const journalStore = useClosedJournalStore();

const referenceTotals = computed(() =>
    journalStore.unfilteredTotals.count > 0 ? journalStore.unfilteredTotals : journalStore.totals
);

const filterOptions = computed(() => [
    {
        value: "ALL" as const,
        label: "Tous",
        count: referenceTotals.value.count || journalStore.total,
    },
    {
        value: "WIN" as const,
        label: "Victoires",
        count: referenceTotals.value.winCount,
        activeClass:
            "bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold",
    },
    {
        value: "LOSS" as const,
        label: "Défaites",
        count: referenceTotals.value.lossCount,
        activeClass:
            "bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold",
    },
    {
        value: "CANCELLED" as const,
        label: "Annulés",
        count: referenceTotals.value.cancelledCount ?? 0,
        activeClass:
            "bg-white text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-200 font-semibold",
    },
]);

onMounted(async () => {
    await journalStore.loadInitial("ALL");
});
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <AppPageHeader
      title="Journal des Positions Clôturées"
      subtitle="Grand livre historique complet des positions résolues et soldées sur Polymarket"
      icon="scroll-text"
    >
      <template #before-title>
        <button
          type="button"
          @click="emit('navigate', 'SYNTHESIS')"
          class="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1.5 mb-2 transition cursor-pointer"
        >
          <AppIcon name="arrow-left" :size="13" />
          <span>Revenir à la Synthèse</span>
        </button>
      </template>

      <template #badges>
        <AppBadge variant="info" size="sm">
          {{ journalStore.total }} archives
        </AppBadge>
      </template>

      <template #actions>
        <AppSegmentedFilter
          :model-value="journalStore.filterStatus"
          :options="filterOptions"
          size="sm"
          @update:model-value="(val) => journalStore.setFilterStatus(val)"
        />
      </template>
    </AppPageHeader>

    <!-- 4 KPIs synthétiques -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatKpiCard
        label="Payout Reçu"
        icon="coins"
        icon-class="text-amber-500"
        :value="formatCurrency(journalStore.totals.totalPayout)"
        subtitle="Montant brut racheté par Polymarket"
      />

      <StatKpiCard
        label="Gains Cumulés"
        icon="trending-up"
        icon-class="text-emerald-500"
        :value="`+${formatCurrency(journalStore.totals.totalGains)}`"
        value-class="text-emerald-600 dark:text-emerald-400"
        :badge-text="`${journalStore.totals.winCount}W`"
        badge-variant="success"
        border-class="border-emerald-500/20"
        subtitle="Profits nets des paris victorieux"
      />

      <StatKpiCard
        label="Pertes Cumulées"
        icon="trending-down"
        icon-class="text-rose-500"
        :value="`-${formatCurrency(journalStore.totals.totalLosses)}`"
        value-class="text-rose-600 dark:text-rose-400"
        :badge-text="`${journalStore.totals.lossCount}L`"
        badge-variant="danger"
        border-class="border-rose-500/20"
        subtitle="Mises perdues sur résolutions contraires"
      />

      <StatKpiCard
        label="Bilan Net (PnL)"
        icon="scale"
        :value="formatSignedCurrency(journalStore.totals.netPnl)"
        :value-class="
          journalStore.totals.netPnl >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        "
        :badge-text="formatSignedPercent(journalStore.totals.roiPercent)"
        :badge-variant="journalStore.totals.netPnl >= 0 ? 'success' : 'danger'"
        :subtitle="`Sur ${formatCurrency(journalStore.totals.totalInvested)} misés (${journalStore.totals.winRate.toFixed(1)}% W)`"
      />
    </div>

    <!-- Tableau Paginé -->
    <div
      class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs transition-colors"
    >
      <div
        class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
      >
        <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AppIcon name="layers" :size="15" class="text-rose-500" />
          <span>Liste des Positions Clôturées</span>
        </h4>
        <span class="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Page {{ journalStore.page }} / {{ journalStore.totalPages }}
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]"
            >
              <th class="py-3 px-6">Marché / Événement</th>
              <th class="py-3 px-4 whitespace-nowrap">Issue</th>
              <th class="py-3 px-4 whitespace-nowrap">Parts</th>
              <th class="py-3 px-4 whitespace-nowrap">Mise</th>
              <th class="py-3 px-4 whitespace-nowrap">Prix Moy.</th>
              <th class="py-3 px-4 whitespace-nowrap">Payout</th>
              <th class="py-3 px-4 whitespace-nowrap">Gain Net</th>
              <th class="py-3 px-6 text-right whitespace-nowrap">Résultat</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
            <tr
              v-for="pos in journalStore.items"
              :key="pos.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
            >
              <td class="py-3.5 px-6 font-sans max-w-[300px]">
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

              <td class="py-3.5 px-4 font-sans whitespace-nowrap">
                <AppBadge variant="info" size="xs" rounded="md" :truncate="true" :title="pos.outcomeLabel">
                  {{ pos.outcomeLabel }}
                </AppBadge>
              </td>

              <td class="py-3.5 px-4 text-slate-900 dark:text-white whitespace-nowrap">
                {{ pos.totalShares.toFixed(2) }}
              </td>

              <td class="py-3.5 px-4 whitespace-nowrap">
                {{ formatCurrency(pos.totalInvestedUsdc) }}
              </td>

              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {{ formatCurrency(pos.avgEntryPrice, 3) }}
              </td>

              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(pos.settledPayoutUsdc) }}
              </td>

              <td
                class="py-3.5 px-4 font-bold whitespace-nowrap"
                :class="
                  (pos.realizedPnlUsdc ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                "
              >
                {{ formatSignedCurrency(pos.realizedPnlUsdc) }}
              </td>

              <td class="py-3.5 px-6 text-right font-sans whitespace-nowrap">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <AppBadge
                    :variant="getClosedPositionOutcome(pos).variant"
                    :icon="getClosedPositionOutcome(pos).icon"
                    size="xs"
                  >
                    {{ getClosedPositionOutcome(pos).label }}
                  </AppBadge>

                  <template
                    v-if="
                      pos.closeReason === 'RESOLVED_WIN' ||
                      (pos.closeReason === 'RESOLVED_CANCELLED' && (pos.settledPayoutUsdc ?? 0) > 0)
                    "
                  >
                    <a
                      v-if="pos.settleTxHash && pos.settleTxHash.startsWith('0x')"
                      :href="'https://polygonscan.com/tx/' + pos.settleTxHash"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir la transaction de rachat sur Polygonscan"
                    >
                      <AppBadge variant="success" icon="external-link" size="xs" rounded="md">
                        Réclamé
                      </AppBadge>
                    </a>
                    <AppBadge
                      v-else-if="pos.settleTxHash"
                      variant="neutral"
                      icon="check"
                      size="xs"
                      rounded="md"
                      title="Gain crédité (Simulation)"
                    >
                      Simu
                    </AppBadge>
                    <AppBadge
                      v-else
                      variant="warning"
                      icon="clock"
                      size="xs"
                      rounded="md"
                      title="Réclamation Auto-Redeem en attente"
                    >
                      En cours
                    </AppBadge>
                  </template>
                </div>
              </td>
            </tr>

            <tr v-if="journalStore.isLoading && journalStore.items.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400 font-sans">
                <span class="inline-flex items-center gap-2 text-xs">
                  <AppIcon name="refresh-cw" :size="14" class="animate-spin" />
                  Chargement des archives...
                </span>
              </td>
            </tr>

            <tr v-if="!journalStore.isLoading && journalStore.items.length === 0">
              <td colspan="8">
                <AppEmptyState
                  icon="scroll-text"
                  title="Aucune position clôturée pour ce filtre"
                  description="Sélectionnez un autre filtre pour visualiser d'autres résultats."
                />
              </td>
            </tr>
          </tbody>

          <!-- Pied de tableau : Totaux globaux -->
          <tfoot
            v-if="journalStore.items.length > 0"
            class="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/80 font-mono text-xs font-bold text-slate-900 dark:text-white"
          >
            <tr>
              <td class="py-3.5 px-6 font-sans whitespace-nowrap">
                <div class="inline-flex items-center gap-2">
                  <AppIcon name="bar-chart" :size="14" class="text-rose-500" />
                  <span>TOTAL CUMULÉ ({{ journalStore.totals.count }})</span>
                </div>
              </td>
              <td class="py-3.5 px-4 font-sans text-slate-400">—</td>
              <td class="py-3.5 px-4 whitespace-nowrap">{{ journalStore.totals.totalShares.toFixed(2) }}</td>
              <td class="py-3.5 px-4 whitespace-nowrap">{{ formatCurrency(journalStore.totals.totalInvested) }}</td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {{ formatCurrency(journalStore.totals.avgEntryPrice, 3) }}
              </td>
              <td class="py-3.5 px-4 whitespace-nowrap">{{ formatCurrency(journalStore.totals.totalPayout) }}</td>
              <td
                class="py-3.5 px-4 whitespace-nowrap"
                :class="
                  journalStore.totals.netPnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                "
              >
                {{ formatSignedCurrency(journalStore.totals.netPnl) }}
              </td>
              <td class="py-3.5 px-6 text-right font-sans whitespace-nowrap">
                <AppBadge
                  :variant="journalStore.totals.winRate >= 50 ? 'success' : 'danger'"
                  size="xs"
                >
                  {{ journalStore.totals.winRate.toFixed(1) }}% W
                </AppBadge>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <AppPagination
        :page="journalStore.page"
        :page-size="journalStore.pageSize"
        :total-items="journalStore.total"
        :total-pages="journalStore.totalPages"
        item-label="positions clôturées"
        @update:page="(p) => journalStore.setPage(p)"
        @update:page-size="(s) => journalStore.setPageSize(s)"
      />
    </div>
  </div>
</template>
