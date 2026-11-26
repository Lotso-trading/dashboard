<script setup lang="ts">
import type {
    ExecutedTrade,
    OpenPosition,
    RiskConfig,
    ServiceVersions,
    TargetTrader,
} from "@lotso-trading/shared";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { wsClient } from "../api/websocket-client.ts";
import FinancialSynthesisView from "../components/FinancialSynthesisView.vue";
import LiveActivityFeed from "../components/LiveActivityFeed.vue";
import MetricsGrid from "../components/MetricsGrid.vue";
import PerformanceChart from "../components/PerformanceChart.vue";
import PositionsTable from "../components/PositionsTable.vue";
import RiskSettingsPanel from "../components/RiskSettingsPanel.vue";
import TargetsFollowTable from "../components/TargetsFollowTable.vue";
import AppBadge from "../components/ui/AppBadge.vue";
import AppIcon, { type IconName } from "../components/ui/AppIcon.vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useSystemStore } from "../stores/use-system.store.ts";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";
import { formatCurrency } from "../utils/formatters.ts";
import ClosedPositionsJournalView from "./ClosedPositionsJournalView.vue";
import PeriodSummaryView from "./PeriodSummaryView.vue";

export type DashboardTab =
    | "SYNTHESIS"
    | "PERIOD_SUMMARY"
    | "OVERVIEW"
    | "TARGETS"
    | "POSITIONS"
    | "CLOSED_JOURNAL"
    | "FEED"
    | "RISK";

const currentTab = ref<DashboardTab>("SYNTHESIS");

function setTab(tab: DashboardTab): void {
    currentTab.value = tab;
    updateHash(tab);
}

function updateHash(tab: DashboardTab): void {
    const map: Record<DashboardTab, string> = {
        SYNTHESIS: "synthesis",
        PERIOD_SUMMARY: "period-summary",
        OVERVIEW: "overview",
        TARGETS: "targets",
        POSITIONS: "positions",
        CLOSED_JOURNAL: "closed-journal",
        FEED: "feed",
        RISK: "risk",
    };
    const targetHash = `#${map[tab] || "synthesis"}`;
    if (typeof window !== "undefined" && window.location.hash !== targetHash) {
        window.location.hash = targetHash;
    }
}

function syncTabFromHash(): void {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.toLowerCase();
    if (
        hash === "#closed-journal" ||
        hash === "#closed" ||
        hash === "#history" ||
        hash === "#journal"
    ) {
        currentTab.value = "CLOSED_JOURNAL";
    } else if (hash === "#period-summary" || hash === "#recap" || hash === "#calendar") {
        currentTab.value = "PERIOD_SUMMARY";
    } else if (hash === "#overview") {
        currentTab.value = "OVERVIEW";
    } else if (hash === "#targets") {
        currentTab.value = "TARGETS";
    } else if (hash === "#positions") {
        currentTab.value = "POSITIONS";
    } else if (hash === "#feed") {
        currentTab.value = "FEED";
    } else if (hash === "#risk") {
        currentTab.value = "RISK";
    } else if (hash === "#synthesis") {
        currentTab.value = "SYNTHESIS";
    }
}

const metricsStore = useMetricsStore();
const targetsStore = useTargetsStore();
const positionsStore = usePositionsStore();
const tradesStore = useTradesStore();
const configStore = useConfigStore();
const last24hStore = useLast24hSummaryStore();
const systemStore = useSystemStore();

const totalClosedCount = computed(() => {
    return (
        last24hStore.totalsAll.count ||
        metricsStore.metrics.closedPositionsCount ||
        positionsStore.closedPositions.length
    );
});

const tabs = computed<
    Array<{
        id: DashboardTab;
        label: string;
        icon: IconName;
        count?: number;
        brandCount?: boolean;
    }>
>(() => [
    { id: "SYNTHESIS", label: "Synthèse", icon: "gem" },
    { id: "PERIOD_SUMMARY", label: "Bilans Périodiques", icon: "calendar-range" },
    { id: "OVERVIEW", label: "Cockpit", icon: "bar-chart" },
    {
        id: "TARGETS",
        label: "Radars & Cibles",
        icon: "target",
        count: targetsStore.targets.length,
        brandCount: true,
    },
    {
        id: "POSITIONS",
        label: "Positions Infiltrées",
        icon: "layers",
        count: positionsStore.positions.length,
    },
    {
        id: "CLOSED_JOURNAL",
        label: "Journal Clôturé",
        icon: "scroll-text",
        count: totalClosedCount.value,
    },
    { id: "FEED", label: "Journal Furtif", icon: "zap" },
    { id: "RISK", label: "Protocole & Risque", icon: "settings" },
]);

onMounted(async () => {
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    await Promise.all([
        systemStore.fetchVersions(),
        metricsStore.fetchMetrics(),
        targetsStore.fetchTargets(),
        positionsStore.fetchPositions(),
        positionsStore.fetchClosedPositions(),
        last24hStore.loadClosedSummaries(),
        tradesStore.fetchTrades(1, 20),
        configStore.fetchConfig(),
    ]);

    wsClient.connect();

    wsClient.on("system:versions", (data) => {
        systemStore.handleVersionsUpdated(data as ServiceVersions);
    });

    wsClient.on("trade:created", (trade) => {
        tradesStore.handleTradeCreated(trade as ExecutedTrade);
        metricsStore.fetchMetrics();
        positionsStore.fetchPositions();
    });

    wsClient.on("position:updated", (pos) => {
        positionsStore.handlePositionUpdated(pos as OpenPosition);
        metricsStore.fetchMetrics();
    });

    wsClient.on("position:closed", (data) => {
        const closed = data as { conditionId?: string; positionId?: string };
        if (closed?.conditionId) {
            positionsStore.handlePositionClosed(closed.conditionId, undefined, closed.positionId);
            positionsStore.fetchClosedPositions();
            targetsStore.fetchTargets();
            last24hStore.loadInitial();
            metricsStore.fetchMetrics();
        }
    });

    wsClient.on("position:redeemed", () => {
        last24hStore.loadPage();
    });

    wsClient.on("target:created", () => {
        targetsStore.fetchTargets();
        metricsStore.fetchMetrics();
    });

    wsClient.on("target:updated", (target) => {
        targetsStore.handleTargetUpdated(target as TargetTrader);
    });

    wsClient.on("target:deleted", () => {
        targetsStore.fetchTargets();
        metricsStore.fetchMetrics();
    });

    wsClient.on("config:updated", (config) => {
        configStore.handleConfigUpdated(config as RiskConfig);
    });

    wsClient.on("positions:cleared", () => {
        positionsStore.fetchPositions();
        metricsStore.fetchMetrics();
    });

    wsClient.on("metrics:updated", () => {
        metricsStore.fetchMetrics();
    });

    wsClient.on("simulation:reset", () => {
        metricsStore.fetchMetrics();
        positionsStore.fetchPositions();
        last24hStore.loadClosedSummaries();
        tradesStore.fetchTrades(1, 20);
    });

    wsClient.on("connected", () => {
        systemStore.fetchVersions();
        metricsStore.fetchMetrics();
        positionsStore.fetchPositions();
    });
});

onBeforeUnmount(() => {
    if (typeof window !== "undefined") {
        window.removeEventListener("hashchange", syncTabFromHash);
    }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Barre d'onglets -->
    <nav
      aria-label="Navigation principale"
      class="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto text-xs font-semibold transition-colors"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        @click="setTab(tab.id)"
        :class="[
          'px-3.5 py-2 rounded-xl transition inline-flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap',
          currentTab === tab.id
            ? 'bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-transparent',
        ]"
      >
        <AppIcon :name="tab.icon" :size="15" />
        <span>{{ tab.label }}</span>
        <AppBadge
          v-if="tab.count !== undefined"
          :variant="tab.brandCount ? 'brand' : 'neutral'"
          size="xs"
        >
          {{ tab.count }}
        </AppBadge>
      </button>
    </nav>

    <!-- Vue Synthèse Financière -->
    <div v-if="currentTab === 'SYNTHESIS'">
      <FinancialSynthesisView @navigate="(tab) => setTab(tab)" />
    </div>

    <!-- Vue Bilans Périodiques (Jour / Semaine / Mois / An) -->
    <div v-else-if="currentTab === 'PERIOD_SUMMARY'">
      <PeriodSummaryView />
    </div>

    <!-- Vue Journal Clôturé -->
    <div v-else-if="currentTab === 'CLOSED_JOURNAL'">
      <ClosedPositionsJournalView @navigate="(tab) => setTab(tab)" />
    </div>

    <!-- Vue Cockpit Stratégique -->
    <div v-else-if="currentTab === 'OVERVIEW'" class="space-y-6">
      <MetricsGrid />
      <PerformanceChart />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Aperçu Positions Actives -->
        <div
          class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs space-y-4 transition-colors"
        >
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
            <div>
              <div class="flex items-center gap-2">
                <AppIcon name="layers" :size="16" class="text-rose-500" />
                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                  Positions Prioritaires
                </h3>
                <AppBadge variant="brand" size="xs">
                  {{ positionsStore.positions.length }}
                </AppBadge>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prochaines échéances Polymarket (rachat garanti 1,00 $/part)
              </p>
            </div>

            <button
              type="button"
              @click="setTab('POSITIONS')"
              class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Voir tout</span>
              <AppIcon name="arrow-right" :size="13" />
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="position in positionsStore.openPositionsSortedByExpiry.slice(0, 4)"
              :key="position.id"
              class="bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-3.5 space-y-2 transition"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <AppBadge
                    :variant="position.outcomeLabel.toLowerCase() === 'yes' ? 'success' : 'danger'"
                    size="xs"
                    rounded="md"
                    :truncate="true"
                  >
                    {{ position.outcomeLabel }}
                  </AppBadge>
                  <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ formatCurrency(position.avgEntryPrice) }}
                  </span>
                </div>

                <AppBadge variant="success" size="xs" rounded="md">
                  Payout {{ formatCurrency(position.totalShares) }}
                </AppBadge>
              </div>

              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                {{ position.marketQuestion }}
              </div>

              <div
                class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-white/[0.04]"
              >
                <span>Mise : {{ formatCurrency(position.totalInvestedUsdc) }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Gain net : +{{ formatCurrency(Math.max(0, position.totalShares - position.totalInvestedUsdc)) }}
                </span>
              </div>
            </div>

            <div
              v-if="positionsStore.positions.length === 0"
              class="text-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.1] rounded-xl text-xs"
            >
              Aucune position ouverte
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-500 dark:text-slate-400 font-mono">
              Total engagé : {{ formatCurrency(positionsStore.totalInvestedUsdc) }}
            </span>
            <button
              type="button"
              @click="setTab('POSITIONS')"
              class="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Gérer ({{ positionsStore.positions.length }})</span>
              <AppIcon name="arrow-right" :size="13" />
            </button>
          </div>
        </div>

        <!-- Flux d'Activité Compact -->
        <LiveActivityFeed :compact="true" />
      </div>
    </div>

    <!-- Vue Radars & Cibles -->
    <div v-else-if="currentTab === 'TARGETS'">
      <TargetsFollowTable />
    </div>

    <!-- Vue Positions Infiltrées -->
    <div v-else-if="currentTab === 'POSITIONS'">
      <PositionsTable @navigate="(tab) => setTab(tab)" />
    </div>

    <!-- Vue Journal Furtif -->
    <div v-else-if="currentTab === 'FEED'">
      <LiveActivityFeed />
    </div>

    <!-- Vue Protocole & Risque -->
    <div v-else-if="currentTab === 'RISK'">
      <RiskSettingsPanel />
    </div>
  </div>
</template>
