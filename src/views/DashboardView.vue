<script setup lang="ts">
import type {
  ExecutedTrade,
  OpenPosition,
  RiskConfig,
  TargetTrader,
} from "@polymarket-copy/shared";
import { onMounted, ref } from "vue";
import { wsClient } from "../api/websocket-client.ts";
import FinancialSynthesisView from "../components/FinancialSynthesisView.vue";
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

const currentTab = ref<"SYNTHESIS" | "OVERVIEW" | "TARGETS" | "POSITIONS" | "FEED" | "RISK">(
  "SYNTHESIS"
);

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
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-semibold transition-colors">
      <!-- 💎 Synthèse Temps Direct -->
      <button
        type="button"
        @click="currentTab = 'SYNTHESIS'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'SYNTHESIS'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>💎</span> Synthèse en Direct
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold animate-pulse">
          LIVE
        </span>
      </button>

      <button
        type="button"
        @click="currentTab = 'OVERVIEW'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'OVERVIEW'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>📊</span> Vue d'Ensemble & PnL
      </button>

      <button
        type="button"
        @click="currentTab = 'TARGETS'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'TARGETS'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>🐋</span> Baleines Suivies
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
          {{ targetsStore.targets.length }}
        </span>
      </button>

      <button
        type="button"
        @click="currentTab = 'POSITIONS'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'POSITIONS'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>📑</span> Positions Ouvertes
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
          {{ positionsStore.positions.length }}
        </span>
      </button>

      <button
        type="button"
        @click="currentTab = 'FEED'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'FEED'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>⚡</span> Flux d'Activité
      </button>

      <button
        type="button"
        @click="currentTab = 'RISK'"
        :class="[
          'px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer',
          currentTab === 'RISK'
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
        ]"
      >
        <span>⚙️</span> Gestion du Risque
      </button>
    </div>

    <!-- Contenu Dynamique par Onglet -->
    <div v-if="currentTab === 'SYNTHESIS'">
      <FinancialSynthesisView />
    </div>

    <!-- 📊 VUE D'ENSEMBLE & PNL (Executive Cockpit) -->
    <div v-else-if="currentTab === 'OVERVIEW'" class="space-y-6">
      <!-- 1. Executive Bento Strip -->
      <MetricsGrid />

      <!-- 2. Performance & Trades Chart -->
      <PerformanceChart />

      <!-- 3. Cockpit Opérationnel Bipolaire (Positions Actives 50% | Flux Live 50%) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Volet Gauche : Aperçu des Positions Actives Prioritaires -->
        <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">📑</span>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                  Positions Ouvertes Prioritaires
                </h3>
                <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono font-bold">
                  {{ positionsStore.positions.length }}
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paiement garanti de 1,00 $ par part gagnante à l'échéance officielle
              </p>
            </div>

            <button
              type="button"
              @click="currentTab = 'POSITIONS'"
              class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group cursor-pointer"
            >
              <span>Voir tout</span>
              <span class="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          <!-- List of up to 4 positions -->
          <div class="space-y-3">
            <div
              v-for="position in positionsStore.openPositionsSortedByExpiry.slice(0, 4)"
              :key="position.id"
              class="bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] rounded-xl p-3.5 space-y-2.5 transition"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider border',
                      position.outcomeLabel.toLowerCase() === 'yes'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    ]"
                  >
                    {{ position.outcomeLabel }}
                  </span>
                  <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Cote ${{ position.avgEntryPrice.toFixed(2) }}
                  </span>
                </div>

                <div class="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                  Payout: ${{ position.totalShares.toFixed(2) }}
                </div>
              </div>

              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                {{ position.marketQuestion }}
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <span>Mise : ${{ position.totalInvestedUsdc.toFixed(2) }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Gain net : +${{ (position.totalShares - position.totalInvestedUsdc).toFixed(2) }}
                </span>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="positionsStore.positions.length === 0"
              class="text-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.1] rounded-xl"
            >
              <p class="font-medium text-slate-600 dark:text-slate-300 text-xs">Aucune position ouverte</p>
            </div>
          </div>

          <!-- Bottom Footer -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-500 dark:text-slate-400 font-mono">
              Total engagé : ${{ positionsStore.totalInvestedUsdc.toFixed(2) }}
            </span>
            <button
              type="button"
              @click="currentTab = 'POSITIONS'"
              class="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold transition cursor-pointer"
            >
              Gérer les {{ positionsStore.positions.length }} positions →
            </button>
          </div>
        </div>

        <!-- Volet Droit : Flux d'Activité en Direct -->
        <LiveActivityFeed />
      </div>
    </div>

    <!-- 🐋 BALEINES SUIVIES -->
    <div v-else-if="currentTab === 'TARGETS'">
      <TargetsFollowTable />
    </div>

    <!-- 📑 POSITIONS OUVERTES -->
    <div v-else-if="currentTab === 'POSITIONS'">
      <PositionsTable />
    </div>

    <!-- ⚡ FLUX D'ACTIVITÉ -->
    <div v-else-if="currentTab === 'FEED'">
      <LiveActivityFeed />
    </div>

    <!-- ⚙️ GESTION DU RISQUE -->
    <div v-else-if="currentTab === 'RISK'">
      <RiskSettingsPanel />
    </div>
  </div>
</template>
