<script setup lang="ts">
import type {
  ExecutedTrade,
  OpenPosition,
  RiskConfig,
  TargetTrader,
} from "@polymarket-copy/shared";
import { onMounted, ref } from "vue";
import { wsClient } from "../api/websocket-client.ts";
import LiveActivityFeed from "../components/LiveActivityFeed.vue";
import MetricsGrid from "../components/MetricsGrid.vue";
import PerformanceChart from "../components/PerformanceChart.vue";
import PositionsTable from "../components/PositionsTable.vue";
import RiskSettingsPanel from "../components/RiskSettingsPanel.vue";
import TargetsFollowTable from "../components/TargetsFollowTable.vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";

const currentTab = ref<"OVERVIEW" | "TARGETS" | "POSITIONS" | "FEED" | "RISK">("OVERVIEW");

const metricsStore = useMetricsStore();
const targetsStore = useTargetsStore();
const positionsStore = usePositionsStore();
const tradesStore = useTradesStore();
const configStore = useConfigStore();

onMounted(async () => {
  // Chargement initial des stores
  await Promise.all([
    metricsStore.fetchMetrics(),
    targetsStore.fetchTargets(),
    positionsStore.fetchPositions(),
    positionsStore.fetchClosedPositions(),
    tradesStore.fetchTrades(1, 30),
    configStore.fetchConfig(),
  ]);

  // Connexion WebSocket temps réel
  wsClient.connect();

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
    const closed = data as { conditionId?: string };
    if (closed?.conditionId) {
      positionsStore.handlePositionClosed(closed.conditionId);
      metricsStore.fetchMetrics();
    }
  });

  wsClient.on("target:updated", (target) => {
    targetsStore.handleTargetUpdated(target as TargetTrader);
  });

  wsClient.on("config:updated", (config) => {
    configStore.handleConfigUpdated(config as RiskConfig & { isBotRunning: boolean });
  });

  wsClient.on("simulation:reset", () => {
    metricsStore.fetchMetrics();
    positionsStore.fetchPositions();
    tradesStore.fetchTrades(1, 30);
  });

  // Polling de secours toutes les 12 secondes
  setInterval(() => {
    metricsStore.fetchMetrics();
    positionsStore.fetchPositions();
  }, 12000);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
      <button
        type="button"
        @click="currentTab = 'OVERVIEW'"
        :class="[
          'px-4 py-2 rounded-lg transition flex items-center gap-2 shrink-0',
          currentTab === 'OVERVIEW'
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        ]"
      >
        <span>📊</span> Vue d'Ensemble & PnL
      </button>

      <button
        type="button"
        @click="currentTab = 'TARGETS'"
        :class="[
          'px-4 py-2 rounded-lg transition flex items-center gap-2 shrink-0',
          currentTab === 'TARGETS'
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        ]"
      >
        <span>🐋</span> Baleines Suivies (Follows)
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
          {{ targetsStore.targets.length }}
        </span>
      </button>

      <button
        type="button"
        @click="currentTab = 'POSITIONS'"
        :class="[
          'px-4 py-2 rounded-lg transition flex items-center gap-2 shrink-0',
          currentTab === 'POSITIONS'
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        ]"
      >
        <span>📑</span> Positions Ouvertes
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
          {{ positionsStore.positions.length }}
        </span>
      </button>

      <button
        type="button"
        @click="currentTab = 'FEED'"
        :class="[
          'px-4 py-2 rounded-lg transition flex items-center gap-2 shrink-0',
          currentTab === 'FEED'
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        ]"
      >
        <span>⚡</span> Flux d'Activité en Direct
      </button>

      <button
        type="button"
        @click="currentTab = 'RISK'"
        :class="[
          'px-4 py-2 rounded-lg transition flex items-center gap-2 shrink-0',
          currentTab === 'RISK'
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        ]"
      >
        <span>⚙️</span> Gestion du Risque
      </button>
    </div>

    <!-- Contenu Dynamique par Onglet -->
    <div v-if="currentTab === 'OVERVIEW'" class="space-y-6">
      <MetricsGrid />
      <PerformanceChart />
      <PositionsTable />
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveActivityFeed />
        <TargetsFollowTable />
      </div>
    </div>

    <div v-else-if="currentTab === 'TARGETS'">
      <TargetsFollowTable />
    </div>

    <div v-else-if="currentTab === 'POSITIONS'">
      <PositionsTable />
    </div>

    <div v-else-if="currentTab === 'FEED'">
      <LiveActivityFeed />
    </div>

    <div v-else-if="currentTab === 'RISK'">
      <RiskSettingsPanel />
    </div>
  </div>
</template>
