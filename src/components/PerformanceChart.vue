<script setup lang="ts">
import { computed, ref } from "vue";
import type { PerformancePoint } from "../api/http-client.ts";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { useTargetsStore } from "../stores/use-targets.store.ts";
import { useTradesStore } from "../stores/use-trades.store.ts";

const configStore = useConfigStore();
const metricsStore = useMetricsStore();
const targetsStore = useTargetsStore();
const tradesStore = useTradesStore();

const initialCapital = computed(() => {
  if (
    configStore.config?.maxAllocatedCapitalUsdc &&
    configStore.config.maxAllocatedCapitalUsdc > 0
  ) {
    return configStore.config.maxAllocatedCapitalUsdc;
  }
  return metricsStore.metrics.initialCapitalUsdc ?? 100.0;
});

// Visibilité des séries
const showPortfolioValue = ref(true);
const showMyCumulativePnl = ref(true);
const showWhaleVolume = ref(true);
const showTradeMarkers = ref(true);
const selectedWhaleAddress = ref<string>("ALL");

// État du survol interactif
const hoveredPoint = ref<PerformancePoint | null>(null);
const hoverX = ref<number>(0);
const hoverY = ref<number>(0);

// Points filtrés
const filteredPoints = computed(() => {
  const points = metricsStore.performanceHistory;
  if (points.length === 0) {
    // Si aucun point dans l'historique, générer un point de référence
    return [
      {
        timestamp: Date.now() - 3600000,
        myCumulativePnlUsdc: 0,
        portfolioValueUsdc: initialCapital.value,
        whaleCumulativeUsdc: 0,
      },
      {
        timestamp: Date.now(),
        myCumulativePnlUsdc: 0,
        portfolioValueUsdc: initialCapital.value,
        whaleCumulativeUsdc: 0,
      },
    ];
  }

  if (selectedWhaleAddress.value === "ALL") {
    return points;
  }

  return points.filter(
    (p) =>
      !p.targetAddress || p.targetAddress.toLowerCase() === selectedWhaleAddress.value.toLowerCase()
  );
});

// Dimensions du SVG
const width = 850;
const height = 280;
const padding = { top: 30, right: 40, bottom: 40, left: 60 };

const chartWidth = width - padding.left - padding.right;
const chartHeight = height - padding.top - padding.bottom;

// Échelles
const timeRange = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return { min: 0, max: 1 };
  const times = pts.map((p) => p.timestamp);
  const min = Math.min(...times);
  const max = Math.max(...times);
  return { min, max: max === min ? min + 1 : max };
});

const valueRange = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return { min: 950, max: 1050 };

  const values: number[] = [];
  for (const p of pts) {
    if (showPortfolioValue.value) values.push(p.portfolioValueUsdc);
    if (showMyCumulativePnl.value) values.push(p.myCumulativePnlUsdc + initialCapital.value); // normalisé
    if (showWhaleVolume.value) values.push(p.whaleCumulativeUsdc);
  }

  if (values.length === 0) return { min: 0, max: 1100 };

  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1050);
  const pad = (maxVal - minVal) * 0.1 || 50;

  return {
    min: Math.floor(minVal - pad),
    max: Math.ceil(maxVal + pad),
  };
});

// Fonctions de coordonnées
function getX(timestamp: number): number {
  const { min, max } = timeRange.value;
  if (max === min) return padding.left + chartWidth / 2;
  return padding.left + ((timestamp - min) / (max - min)) * chartWidth;
}

function getY(val: number): number {
  const { min, max } = valueRange.value;
  if (max === min) return padding.top + chartHeight / 2;
  return padding.top + chartHeight - ((val - min) / (max - min)) * chartHeight;
}

// Construction des tracés SVG
const portfolioPath = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return "";
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${getX(p.timestamp).toFixed(1)} ${getY(p.portfolioValueUsdc).toFixed(1)}`
    )
    .join(" ");
});

const portfolioAreaPath = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return "";
  const firstX = getX(pts[0].timestamp);
  const lastX = getX(pts[pts.length - 1].timestamp);
  const bottomY = padding.top + chartHeight;
  return `${portfolioPath.value} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
});

const myPnlPath = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return "";
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${getX(p.timestamp).toFixed(1)} ${getY(p.myCumulativePnlUsdc + initialCapital.value).toFixed(1)}`
    )
    .join(" ");
});

const whalePath = computed(() => {
  const pts = filteredPoints.value;
  if (pts.length === 0) return "";
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${getX(p.timestamp).toFixed(1)} ${getY(p.whaleCumulativeUsdc).toFixed(1)}`
    )
    .join(" ");
});

// Points de trade individuels
const tradeMarkers = computed(() => {
  return filteredPoints.value.filter((p) => p.side !== undefined);
});

// Graduation Y
const yTicks = computed(() => {
  const { min, max } = valueRange.value;
  const count = 5;
  const step = (max - min) / count;
  const ticks: { val: number; y: number }[] = [];
  for (let i = 0; i <= count; i++) {
    const val = Math.round(min + step * i);
    ticks.push({ val, y: getY(val) });
  }
  return ticks;
});

// Graduation X (Heures)
const xTicks = computed(() => {
  const { min, max } = timeRange.value;
  const count = 4;
  const step = (max - min) / count;
  const ticks: { time: number; x: number; label: string }[] = [];
  for (let i = 0; i <= count; i++) {
    const time = min + step * i;
    const date = new Date(time);
    ticks.push({
      time,
      x: getX(time),
      label: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    });
  }
  return ticks;
});

function handlePointHover(point: PerformancePoint, event: MouseEvent) {
  hoveredPoint.value = point;
  const target = event.currentTarget as HTMLElement | null;
  if (target) {
    const rect = target.getBoundingClientRect();
    hoverX.value = rect.left + rect.width / 2;
    hoverY.value = rect.top;
  }
}

function handleMouseLeave() {
  hoveredPoint.value = null;
}
</script>

<template>
  <div class="bg-white dark:bg-[#121721] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden p-6 relative shadow-xs transition-colors">
    <!-- Header Graphique -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📈</span> Courbe de Performance Lotso vs Cibles
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Évolution en temps réel de votre capital, comparaison des gains et traçabilité des ordres répliqués
        </p>
      </div>

      <!-- Contrôles et Filtres -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Filtre Baleine -->
        <select
          v-model="selectedWhaleAddress"
          class="bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
        >
          <option value="ALL">Toutes les Baleines</option>
          <option
            v-for="target in targetsStore.targets"
            :key="target.id"
            :value="target.address"
          >
            🐋 {{ target.alias }}
          </option>
        </select>

        <!-- Toggles de Séries -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0E14] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <!-- Capital Portefeuille -->
          <button
            type="button"
            @click="showPortfolioValue = !showPortfolioValue"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer',
              showPortfolioValue
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 inline-block"></span>
            Capital Portefeuille
          </button>

          <!-- Mes Gains Copiés -->
          <button
            type="button"
            @click="showMyCumulativePnl = !showMyCumulativePnl"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer',
              showMyCumulativePnl
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block"></span>
            Mes Gains Copiés
          </button>

          <!-- Volume Baleine -->
          <button
            type="button"
            @click="showWhaleVolume = !showWhaleVolume"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer',
              showWhaleVolume
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 inline-block"></span>
            Volume Baleine
          </button>

          <!-- Marqueurs Trades -->
          <button
            type="button"
            @click="showTradeMarkers = !showTradeMarkers"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer',
              showTradeMarkers
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 inline-block"></span>
            Trades
          </button>
        </div>
      </div>
    </div>

    <!-- Conteneur SVG Réactif -->
    <div class="relative w-full aspect-[850/280] max-h-[360px]" @mouseleave="handleMouseLeave">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        class="w-full h-full overflow-visible font-mono select-none"
      >
        <defs>
          <!-- Dégradé sous la courbe de capital -->
          <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
          </linearGradient>

          <!-- Dégradé PnL -->
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Lignes horizontales de graduation Y -->
        <g class="text-slate-700 stroke-slate-800/80 stroke-dasharray-[2,4]">
          <line
            v-for="tick in yTicks"
            :key="tick.val"
            :x1="padding.left"
            :y1="tick.y"
            :x2="width - padding.right"
            :y2="tick.y"
            stroke="currentColor"
            stroke-width="1"
            stroke-dasharray="3,3"
          />
        </g>

        <!-- Labels Y (Montants en $) -->
        <g class="text-[10px] fill-slate-500 text-right">
          <text
            v-for="tick in yTicks"
            :key="'label-' + tick.val"
            :x="padding.left - 10"
            :y="tick.y + 3"
            text-anchor="end"
          >
            ${{ tick.val }}
          </text>
        </g>

        <!-- Ligne de flottaison Base Capital -->
        <line
          :x1="padding.left"
          :y1="getY(initialCapital)"
          :x2="width - padding.right"
          :y2="getY(initialCapital)"
          stroke="#475569"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <text
          :x="width - padding.right + 5"
          :y="getY(initialCapital) + 3"
          fill="#64748b"
          class="text-[9px]"
        >
          Base {{ initialCapital }} $
        </text>

        <!-- Labels X (Heures) -->
        <g class="text-[10px] fill-slate-500 text-center">
          <text
            v-for="tick in xTicks"
            :key="'xtick-' + tick.time"
            :x="tick.x"
            :y="height - padding.bottom + 20"
            text-anchor="middle"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- Surface sous le capital -->
        <path
          v-if="showPortfolioValue && portfolioAreaPath"
          :d="portfolioAreaPath"
          fill="url(#capitalGradient)"
        />

        <!-- Courbe 1 : Progression Volume Baleine -->
        <path
          v-if="showWhaleVolume && whalePath"
          :d="whalePath"
          fill="none"
          stroke="#c084fc"
          stroke-width="2"
          stroke-dasharray="4,4"
          class="transition-all duration-300"
        />

        <!-- Courbe 2 : PnL Copié Net (+ base capital) -->
        <path
          v-if="showMyCumulativePnl && myPnlPath"
          :d="myPnlPath"
          fill="none"
          stroke="#34d399"
          stroke-width="2"
          class="transition-all duration-300"
        />

        <!-- Courbe 3 : Capital Portefeuille -->
        <path
          v-if="showPortfolioValue && portfolioPath"
          :d="portfolioPath"
          fill="none"
          stroke="#38bdf8"
          stroke-width="2.5"
          class="transition-all duration-300"
        />

        <!-- Ligne verticale au survol (pointer-events-none pour éviter tout clignotement) -->
        <line
          v-if="hoveredPoint"
          :x1="getX(hoveredPoint.timestamp)"
          :y1="padding.top"
          :x2="getX(hoveredPoint.timestamp)"
          :y2="height - padding.bottom"
          stroke="#94a3b8"
          stroke-width="1"
          stroke-dasharray="2,2"
          pointer-events="none"
        />

        <!-- Marqueurs de Trades Répliqués -->
        <g v-if="showTradeMarkers">
          <g
            v-for="trade in tradeMarkers"
            :key="trade.tradeId || trade.timestamp"
            class="cursor-pointer"
            @mouseenter="handlePointHover(trade, $event)"
          >
            <!-- Hitbox transparente élargie pour éviter le clignotement -->
            <circle
              :cx="getX(trade.timestamp)"
              :y="getY(trade.portfolioValueUsdc)"
              r="16"
              fill="transparent"
            />

            <!-- Cercle visuel stable avec agrandissement réactif sans CSS scale -->
            <circle
              :cx="getX(trade.timestamp)"
              :y="getY(trade.portfolioValueUsdc)"
              :r="hoveredPoint?.tradeId && hoveredPoint.tradeId === trade.tradeId ? 7 : (trade.side === 'BUY' ? 4.5 : 5)"
              :class="[
                'pointer-events-none transition-all duration-150',
                trade.side === 'BUY'
                  ? (hoveredPoint?.tradeId === trade.tradeId ? 'fill-emerald-300 stroke-white stroke-2' : 'fill-emerald-400 stroke-[#0B0E14] stroke-2')
                  : (hoveredPoint?.tradeId === trade.tradeId ? 'fill-rose-300 stroke-white stroke-2' : 'fill-rose-400 stroke-[#0B0E14] stroke-2')
              ]"
            />
          </g>
        </g>
      </svg>

      <!-- Tooltip Flottant Interactif -->
      <div
        v-if="hoveredPoint"
        class="absolute pointer-events-none z-20 bg-white/95 dark:bg-[#0B0E14]/95 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur text-xs font-mono space-y-1.5 min-w-[240px] text-slate-800 dark:text-slate-100 transition-colors"
        :style="{
          left: `${Math.min(width - 250, Math.max(20, getX(hoveredPoint.timestamp) - 120))}px`,
          top: `10px`,
        }"
      >
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <span>{{ new Date(hoveredPoint.timestamp).toLocaleTimeString('fr-FR') }}</span>
          <span
            v-if="hoveredPoint.side"
            :class="[
              'px-1.5 py-0.5 rounded font-bold uppercase text-[10px]',
              hoveredPoint.side === 'BUY'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            ]"
          >
            {{ hoveredPoint.side === 'BUY' ? 'Achat Copié' : 'Vente Copiée' }}
          </span>
        </div>

        <div v-if="hoveredPoint.targetAlias" class="text-slate-700 dark:text-slate-200">
          <span class="text-slate-500 dark:text-slate-400">Baleine :</span>
          <span class="font-bold text-blue-600 dark:text-blue-400 ml-1.5">{{ hoveredPoint.targetAlias }}</span>
        </div>

        <div v-if="hoveredPoint.shares" class="text-slate-700 dark:text-slate-200">
          <span class="text-slate-500 dark:text-slate-400">Parts :</span>
          <span class="font-bold text-slate-900 dark:text-white ml-1.5">{{ hoveredPoint.shares.toFixed(1) }} parts</span>
          <span class="text-slate-500 dark:text-slate-400 ml-1">@ ${{ (hoveredPoint.price ?? 0).toFixed(3) }}</span>
        </div>

        <div v-if="hoveredPoint.costUsdc" class="text-slate-700 dark:text-slate-200">
          <span class="text-slate-500 dark:text-slate-400">Mise :</span>
          <span class="font-bold text-amber-600 dark:text-amber-400 ml-1.5">${{ hoveredPoint.costUsdc.toFixed(2) }} USDC</span>
        </div>

        <div v-if="hoveredPoint.shares && hoveredPoint.costUsdc" class="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
          <div>Si gagnant : <strong class="text-slate-900 dark:text-white">${{ hoveredPoint.shares.toFixed(2) }} USDC</strong></div>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-300">Bénéfice net : +${{ (hoveredPoint.shares - hoveredPoint.costUsdc).toFixed(2) }}</div>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-800/80 pt-1.5 space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-500 dark:text-slate-400">Capital Portefeuille :</span>
            <span class="font-bold text-sky-600 dark:text-sky-400">${{ hoveredPoint.portfolioValueUsdc.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500 dark:text-slate-400">PnL Net Copié :</span>
            <span
              :class="hoveredPoint.myCumulativePnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              class="font-bold"
            >
              {{ hoveredPoint.myCumulativePnlUsdc >= 0 ? '+' : '' }}${{ hoveredPoint.myCumulativePnlUsdc.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Légende et Métriques Rapides sous le Graphique -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 text-xs">
      <div class="bg-slate-50 dark:bg-[#0B0E14]/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400 text-[11px] block">Capital Actuel</span>
        <span class="text-sm font-bold font-mono text-slate-900 dark:text-white">
          ${{ (initialCapital - metricsStore.metrics.totalInvestedUsdc + metricsStore.metrics.currentPositionsValueUsdc).toFixed(2) }}
        </span>
      </div>

      <div class="bg-slate-50 dark:bg-[#0B0E14]/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400 text-[11px] block">PnL Latent</span>
        <span
          class="text-sm font-bold font-mono"
          :class="metricsStore.metrics.unrealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
        >
          {{ metricsStore.metrics.unrealizedPnlUsdc >= 0 ? '+' : '' }}${{ metricsStore.metrics.unrealizedPnlUsdc.toFixed(2) }}
        </span>
      </div>

      <div class="bg-slate-50 dark:bg-[#0B0E14]/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400 text-[11px] block">Trades Répliqués</span>
        <span class="text-sm font-bold font-mono text-sky-600 dark:text-sky-400">
          {{ metricsStore.metrics.totalCopiedTrades }} exécutés
        </span>
      </div>

      <div class="bg-slate-50 dark:bg-[#0B0E14]/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400 text-[11px] block">Protection Risque</span>
        <span class="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
          {{ metricsStore.metrics.totalRejectedTrades }} rejets
        </span>
      </div>
    </div>
  </div>
</template>
