<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePositionsStore } from "../stores/use-positions.store.ts";

const positionsStore = usePositionsStore();
const activeTab = ref<"OPEN" | "CLOSED">("OPEN");
const viewMode = ref<"CARDS" | "TABLE">("CARDS");
const showExplainer = ref(false);
const settlementMessage = ref<string | null>(null);

onMounted(() => {
  positionsStore.fetchPositions();
  positionsStore.fetchClosedPositions();
});

async function handleSettlement() {
  const res = await positionsStore.triggerSettlement();
  settlementMessage.value = res.message;
  setTimeout(() => {
    settlementMessage.value = null;
  }, 5000);
}

function getMarketUrl(position: {
  marketSlug?: string;
  marketQuestion?: string;
  conditionId?: string;
}): string {
  if (
    position.marketSlug &&
    position.marketSlug !== "market" &&
    position.marketSlug !== "polygon-onchain" &&
    position.marketSlug !== "polymarket-market"
  ) {
    return `https://polymarket.com/event/${position.marketSlug}`;
  }
  if (
    position.marketQuestion &&
    position.marketQuestion !== "Polymarket Question" &&
    position.marketQuestion !== "Question inconnue"
  ) {
    return `https://polymarket.com/search?q=${encodeURIComponent(position.marketQuestion)}`;
  }
  if (position.conditionId && position.conditionId !== "0x") {
    return `https://polymarket.com/search?q=${encodeURIComponent(position.conditionId)}`;
  }
  return "https://polymarket.com";
}

function formatLocalDate(isoDate?: string): string {
  if (!isoDate) return "Date indéterminée";
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "Date indéterminée";

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Date indéterminée";
  }
}

function formatUtcDate(isoDate?: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toISOString().replace("T", " ").substring(0, 16)} UTC`;
  } catch {
    return "";
  }
}

function getRelativeTime(isoDate?: string): string {
  if (!isoDate) return "";
  try {
    const targetTime = new Date(isoDate).getTime();
    if (Number.isNaN(targetTime)) return "";
    const now = Date.now();
    const diffMs = targetTime - now;

    if (diffMs <= 0) {
      return "⌛ Clôture / Résolution";
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 60) {
      return `⏳ Dans ${Math.max(1, diffMinutes)} min`;
    }
    if (diffHours < 24) {
      return `⏳ Dans ${diffHours} h`;
    }
    if (diffDays === 1) {
      return "⏳ Demain";
    }
    if (diffDays < 30) {
      return `⏳ Dans ${diffDays} jours`;
    }
    const diffMonths = Math.floor(diffDays / 30.4);
    return `⏳ Dans ${diffMonths} mois`;
  } catch {
    return "";
  }
}

function getExpiryBadgeClass(isoDate?: string): string {
  if (!isoDate)
    return "text-slate-500 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80";
  try {
    const targetTime = new Date(isoDate).getTime();
    if (Number.isNaN(targetTime))
      return "text-slate-500 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80";
    const diffMs = targetTime - Date.now();
    const diffDays = diffMs / 86400000;

    if (diffMs <= 0) {
      return "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40";
    }
    if (diffDays <= 2) {
      return "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/40";
    }
    if (diffDays <= 7) {
      return "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/40";
    }
    return "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60";
  } catch {
    return "text-slate-500 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80";
  }
}

const netPotentialProfitUsdc = computed(() => {
  return Math.max(0, positionsStore.totalPayoutPotentialUsdc - positionsStore.totalInvestedUsdc);
});

export type SortOption =
  | "EXPIRY_ASC"
  | "EXPIRY_DESC"
  | "INVESTED_DESC"
  | "PAYOUT_DESC"
  | "OPENED_DESC";

const sortOption = ref<SortOption>("EXPIRY_ASC");

function getEndDateTimestamp(isoDate?: string): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const time = new Date(isoDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

const sortedOpenPositions = computed(() => {
  const list = [...positionsStore.positions];

  return list.sort((a, b) => {
    switch (sortOption.value) {
      case "EXPIRY_ASC": {
        const timeA = getEndDateTimestamp(a.endDate);
        const timeB = getEndDateTimestamp(b.endDate);
        if (timeA !== timeB) return timeA - timeB;
        return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
      }
      case "EXPIRY_DESC": {
        const timeA = getEndDateTimestamp(a.endDate);
        const timeB = getEndDateTimestamp(b.endDate);
        if (timeA === Number.POSITIVE_INFINITY && timeB === Number.POSITIVE_INFINITY) return 0;
        if (timeA === Number.POSITIVE_INFINITY) return 1;
        if (timeB === Number.POSITIVE_INFINITY) return -1;
        if (timeA !== timeB) return timeB - timeA;
        return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
      }
      case "INVESTED_DESC":
        return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
      case "PAYOUT_DESC": {
        const profitA = Math.max(0, (a.totalShares || 0) - (a.totalInvestedUsdc || 0));
        const profitB = Math.max(0, (b.totalShares || 0) - (b.totalInvestedUsdc || 0));
        return profitB - profitA;
      }
      case "OPENED_DESC":
        return (b.openedAt || 0) - (a.openedAt || 0);
      default:
        return 0;
    }
  });
});

function toggleExpirySort() {
  if (sortOption.value === "EXPIRY_ASC") {
    sortOption.value = "EXPIRY_DESC";
  } else {
    sortOption.value = "EXPIRY_ASC";
  }
}
</script>

<template>
  <div class="bg-white dark:bg-[#0b0f17]/95 border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs dark:shadow-2xl backdrop-blur-xl space-y-6 transition-colors">
    <!-- Top Action Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-5">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="text-xl">📑</span>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Positions & Infiltrations Ouvertes
          </h3>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium font-mono">
            Lotso Stealth
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Suivi temps réel des parts acquises sous les radars et encaissement officiel garanti à 1,00 $ USDC
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Settlement Button -->
        <button
          type="button"
          @click="handleSettlement"
          :disabled="positionsStore.isSettling"
          class="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span :class="{ 'animate-spin': positionsStore.isSettling }">🔄</span>
          <span>{{ positionsStore.isSettling ? 'Vérification...' : 'Encaisser & Vérifier' }}</span>
        </button>

        <!-- View Switcher (Cards / Table) -->
        <div class="bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-xl flex items-center text-xs">
          <button
            type="button"
            @click="viewMode = 'CARDS'"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer',
              viewMode === 'CARDS'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>🗂️</span>
            <span>Cartes</span>
          </button>
          <button
            type="button"
            @click="viewMode = 'TABLE'"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer',
              viewMode === 'TABLE'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>📋</span>
            <span>Liste</span>
          </button>
        </div>

        <!-- Guide Toggle -->
        <button
          type="button"
          @click="showExplainer = !showExplainer"
          class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>💡</span>
          <span>{{ showExplainer ? 'Masquer Guide' : 'Comprendre Gains' }}</span>
        </button>
      </div>
    </div>

    <!-- Settlement Alert Notification -->
    <div
      v-if="settlementMessage"
      class="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span>✨</span>
        <span>{{ settlementMessage }}</span>
      </div>
      <button type="button" @click="settlementMessage = null" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200">✕</button>
    </div>

    <!-- 4 Hero KPI Glass Cards (Apple Style Grid) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <!-- Card 1 : Capital Engagé -->
      <div class="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-4 space-y-1 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/[0.12] transition shadow-xs">
        <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Capital Engagé</span>
          <span class="text-blue-500 dark:text-blue-400">💼</span>
        </div>
        <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
          ${{ positionsStore.totalInvestedUsdc.toFixed(2) }}
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400">
          {{ positionsStore.positions.length }} position(s) active(s)
        </div>
      </div>

      <!-- Card 2 : Max Payout Garanti -->
      <div class="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 space-y-1 relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-500/40 transition shadow-xs">
        <div class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
          <span>Gains Max Garantis</span>
          <span>🏆</span>
        </div>
        <div class="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tracking-tight">
          ${{ positionsStore.totalPayoutPotentialUsdc.toFixed(2) }}
        </div>
        <div class="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-medium">
          Bénéfice net latent : +${{ netPotentialProfitUsdc.toFixed(2) }} USDC
        </div>
      </div>

      <!-- Card 3 : Payouts Déjà Encaissés -->
      <div class="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-4 space-y-1 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/[0.12] transition shadow-xs">
        <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Cash Encaissé (Résolu)</span>
          <span class="text-emerald-500 dark:text-emerald-400">💰</span>
        </div>
        <div class="text-xl font-bold font-mono tracking-tight" :class="positionsStore.totalRealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
          {{ positionsStore.totalRealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalRealizedPnlUsdc.toFixed(2) }}
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400">
          {{ positionsStore.closedPositions.length }} position(s) clôturée(s)
        </div>
      </div>

      <!-- Card 4 : Revente Immédiate -->
      <div class="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-4 space-y-1 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/[0.12] transition shadow-xs">
        <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Valeur Carnet Instant</span>
          <span class="text-amber-500 dark:text-amber-400">⏱️</span>
        </div>
        <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
          ${{ positionsStore.totalPositionsValueUsdc.toFixed(2) }}
        </div>
        <div class="text-[11px]" :class="positionsStore.totalUnrealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
          Écart carnet : {{ positionsStore.totalUnrealizedPnlUsdc >= 0 ? '+' : '' }}${{ positionsStore.totalUnrealizedPnlUsdc.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Explainer Drawer (Apple Collapsible Style) -->
    <div
      v-if="showExplainer"
      class="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-3 transition-all"
    >
      <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm">
        <span>💡</span> Guide de lecture : "Valeur Carnet" vs "Paiement Garanti à l'Échéance"
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
        <div class="bg-white dark:bg-black/30 p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
          <div class="text-amber-600 dark:text-amber-300 font-bold mb-1">⏱️ Valeur Actuelle (Si Revente au Carnet)</div>
          C'est ce que vous récupéreriez si vous vendiez tout de suite au carnet d'ordres avant la fin du match. Tant que le match n'est pas terminé, elle reste proche de votre mise.
        </div>
        <div class="bg-white dark:bg-black/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
          <div class="text-emerald-600 dark:text-emerald-400 font-bold mb-1">🏆 À l'Échéance (Paiement Garanti Polymarket)</div>
          Sur Polymarket, chaque part gagnante est rachetée à <strong>1,00 USDC</strong> fixe. Votre mise de départ est remboursée en totalité et vous encaissez 100% du bénéfice net !
        </div>
      </div>
    </div>

    <!-- Segmented Tabs (Apple Pill Switcher) & Sort Control -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] p-1 rounded-xl w-fit text-xs font-semibold">
        <button
          type="button"
          @click="activeTab = 'OPEN'"
          :class="[
            'px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 cursor-pointer',
            activeTab === 'OPEN'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>🟢</span>
          <span>Positions Ouvertes</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono font-bold">
            {{ positionsStore.positions.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'CLOSED'"
          :class="[
            'px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 cursor-pointer',
            activeTab === 'CLOSED'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>🏁</span>
          <span>Clôturées & Encaissées</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono font-bold">
            {{ positionsStore.closedPositions.length }}
          </span>
        </button>
      </div>

      <!-- Sélecteur de Tri pour Positions Ouvertes -->
      <div v-if="activeTab === 'OPEN'" class="flex items-center gap-2 text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
          <span>↕️</span> Trier par :
        </span>
        <div class="relative">
          <select
            v-model="sortOption"
            class="bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          >
            <option value="EXPIRY_ASC">⏳ Échéance : Se termine bientôt</option>
            <option value="EXPIRY_DESC">📅 Échéance : Se termine plus tard</option>
            <option value="INVESTED_DESC">💼 Mise engagée (décroissante)</option>
            <option value="PAYOUT_DESC">🏆 Gain net potentiel (décroissant)</option>
            <option value="OPENED_DESC">🕒 Plus récentes en premier</option>
          </select>
          <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
            ▼
          </span>
        </div>
      </div>
    </div>

    <!-- TAB 1 : POSITIONS OUVERTES -->
    <div v-if="activeTab === 'OPEN'">
      <!-- MODE CARTES BENTO (Apple Cards Layout) -->
      <div v-if="viewMode === 'CARDS'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="position in sortedOpenPositions"
          :key="position.id"
          class="bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15] rounded-2xl p-5 space-y-4 transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md"
        >
          <!-- Top Row : Issue Badge + Link -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider border',
                  position.outcomeLabel.toLowerCase() === 'yes'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                ]"
              >
                {{ position.outcomeLabel }}
              </span>

              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Cote ${{ position.avgEntryPrice.toFixed(3) }} ({{ (position.avgEntryPrice * 100).toFixed(0) }}%)
              </span>
            </div>

            <a
              :href="getMarketUrl(position)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 font-mono transition shrink-0 bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.06]"
              title="Ouvrir l'événement sur Polymarket"
            >
              <span>Polymarket</span>
              <span>↗</span>
            </a>
          </div>

          <!-- Market Question -->
          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition line-clamp-2 leading-snug">
              {{ position.marketQuestion }}
            </h4>
          </div>

          <!-- Progress Bar to $1.00 Payout -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>Cote d'entrée : ${{ position.avgEntryPrice.toFixed(2) }}</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Cible : $1.00</span>
            </div>
            <div class="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                class="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, Math.max(8, position.avgEntryPrice * 100))}%` }"
              />
            </div>
          </div>

          <!-- Expiry & Timezone (Thailand & UTC) -->
          <div class="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/[0.04] rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px]" :title="`Heure UTC Polymarket : ${formatUtcDate(position.endDate)}`">
              <span>📅</span>
              <span class="font-medium">{{ formatLocalDate(position.endDate) }}</span>
              <span class="text-slate-400 text-[10px]" title="Heure locale de votre appareil (Thaïlande)">🇹🇭</span>
            </div>
            <div
              :class="getExpiryBadgeClass(position.endDate)"
              class="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
            >
              {{ getRelativeTime(position.endDate) }}
            </div>
          </div>

          <!-- Financial Breakdown Box -->
          <div class="grid grid-cols-2 gap-2 pt-1 text-xs">
            <!-- Left : Invested & Shares -->
            <div class="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] rounded-xl p-3 space-y-0.5 shadow-2xs">
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mise Engagée</div>
              <div class="text-base font-bold text-slate-900 dark:text-white font-mono">
                ${{ position.totalInvestedUsdc.toFixed(2) }}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {{ position.totalShares.toFixed(1) }} parts détenues
              </div>
            </div>

            <!-- Right : Guaranteed Payout (Hero Glow) -->
            <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 space-y-0.5 shadow-2xs">
              <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Si Gagnant (1,00$)
              </div>
              <div class="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                ${{ position.totalShares.toFixed(2) }}
              </div>
              <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                Gain Net : +${{ (position.totalShares - position.totalInvestedUsdc).toFixed(2) }}
                <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  +{{ (((position.totalShares - position.totalInvestedUsdc) / (position.totalInvestedUsdc || 1)) * 100).toFixed(0) }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="sortedOpenPositions.length === 0"
          class="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.1] rounded-2xl"
        >
          <div class="text-3xl mb-2">📑</div>
          <p class="font-semibold text-slate-700 dark:text-slate-300 text-sm">Aucune position active pour le moment</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Dès qu'une baleine suivie passe un ordre, votre position et son paiement garanti s'afficheront ici.
          </p>
        </div>
      </div>

      <!-- MODE TABLEAU PRO (Spacious Pro Table) -->
      <div v-else class="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-black/30">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3.5 px-6">Marché / Prédiction</th>
              <th class="py-3 px-4">Issue</th>
              <th
                @click="toggleExpirySort"
                class="py-3 px-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none transition group"
                title="Cliquer pour trier par date d'échéance"
              >
                <div class="flex items-center gap-1.5">
                  <span>Échéance (🇹🇭 Locale)</span>
                  <span class="text-blue-600 dark:text-blue-400 font-bold text-xs transition-transform">
                    <template v-if="sortOption === 'EXPIRY_ASC'">↑</template>
                    <template v-else-if="sortOption === 'EXPIRY_DESC'">↓</template>
                    <template v-else><span class="opacity-40 group-hover:opacity-100">↕</span></template>
                  </span>
                </div>
              </th>
              <th class="py-3 px-4">Parts & Cote</th>
              <th class="py-3 px-4">Mise Engagée</th>
              <th class="py-3 px-4">Revente Instant</th>
              <th class="py-3 px-6">Si Victoire (1,00$)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04] text-slate-700 dark:text-slate-200">
            <tr
              v-for="position in sortedOpenPositions"
              :key="position.id"
              class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
            >
              <td class="py-4 px-6 max-w-sm">
                <div class="font-semibold text-slate-900 dark:text-white truncate" :title="position.marketQuestion">
                  {{ position.marketQuestion }}
                </div>
                <div class="mt-1">
                  <a
                    :href="getMarketUrl(position)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-[11px] font-mono hover:underline inline-flex items-center gap-1"
                  >
                    <span>Ouvrir sur Polymarket</span>
                    <span>↗</span>
                  </a>
                </div>
              </td>

              <td class="py-3 px-4">
                <span
                  :class="[
                    'px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-block border',
                    position.outcomeLabel.toLowerCase() === 'yes'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                  ]"
                >
                  {{ position.outcomeLabel }}
                </span>
              </td>

              <td class="py-3 px-4 font-mono">
                <div class="text-slate-900 dark:text-white text-xs" :title="`UTC : ${formatUtcDate(position.endDate)}`">
                  {{ formatLocalDate(position.endDate) }}
                </div>
                <div :class="getExpiryBadgeClass(position.endDate)" class="text-[10px] px-2 py-0.5 rounded-full inline-block font-semibold mt-1 border">
                  {{ getRelativeTime(position.endDate) }}
                </div>
              </td>

              <td class="py-3 px-4 font-mono">
                <div class="text-slate-900 dark:text-white font-bold">{{ position.totalShares.toFixed(1) }} parts</div>
                <div class="text-slate-500 dark:text-slate-400 text-[11px]">${{ position.avgEntryPrice.toFixed(3) }} ({{ (position.avgEntryPrice * 100).toFixed(0) }}%)</div>
              </td>

              <td class="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                ${{ position.totalInvestedUsdc.toFixed(2) }}
              </td>

              <td class="py-3 px-4 font-mono">
                <div class="text-slate-800 dark:text-slate-200 font-semibold">${{ position.currentMarketValueUsdc.toFixed(2) }}</div>
                <div class="text-[11px]" :class="position.unrealizedPnlUsdc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
                  {{ position.unrealizedPnlUsdc >= 0 ? '+' : '' }}${{ position.unrealizedPnlUsdc.toFixed(2) }}
                </div>
              </td>

              <td class="py-3.5 px-6 font-mono">
                <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-2.5">
                  <div class="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    ${{ position.totalShares.toFixed(2) }} USDC
                  </div>
                  <div class="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    Gain Net : +${{ (position.totalShares - position.totalInvestedUsdc).toFixed(2) }}
                    <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold ml-1">
                      +{{ (((position.totalShares - position.totalInvestedUsdc) / (position.totalInvestedUsdc || 1)) * 100).toFixed(0) }}%
                    </span>
                  </div>
                </div>
              </td>
            </tr>

            <tr v-if="sortedOpenPositions.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-400 text-xs">
                Aucune position ouverte actuellement.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2 : POSITIONS CLÔTURÉES & ENCAISSÉES -->
    <div v-else-if="activeTab === 'CLOSED'">
      <div class="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-black/30">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3.5 px-6">Marché / Prédiction</th>
              <th class="py-3 px-4">Issue</th>
              <th class="py-3 px-4">Résultat Officiel</th>
              <th class="py-3 px-4">Mise Initiale</th>
              <th class="py-3 px-4">Cash Encaissé (Payout)</th>
              <th class="py-3 px-4">Bénéfice Réalisé (PnL)</th>
              <th class="py-3 px-6">Date de Clôture</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04] text-slate-700 dark:text-slate-200">
            <tr
              v-for="position in positionsStore.closedPositions"
              :key="position.id"
              class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
            >
              <td class="py-4 px-6 max-w-sm">
                <div class="font-semibold text-slate-900 dark:text-white truncate" :title="position.marketQuestion">
                  {{ position.marketQuestion }}
                </div>
                <div class="mt-1">
                  <a
                    :href="getMarketUrl(position)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-[11px] font-mono hover:underline inline-flex items-center gap-1"
                  >
                    <span>Polymarket</span>
                    <span>↗</span>
                  </a>
                </div>
              </td>

              <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {{ position.outcomeLabel }}
                </span>
              </td>

              <td class="py-3 px-4 font-mono">
                <span
                  v-if="position.closeReason === 'RESOLVED_WIN'"
                  class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1"
                >
                  <span>🎉</span> Victoire (1,00$)
                </span>
                <span
                  v-else-if="position.closeReason === 'RESOLVED_LOSS'"
                  class="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1"
                >
                  <span>❌</span> Perdu (0,00$)
                </span>
                <span
                  v-else
                  class="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1"
                >
                  <span>💰</span> Vente Anticipée
                </span>
              </td>

              <td class="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                ${{ position.totalInvestedUsdc.toFixed(2) }}
              </td>

              <td class="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                ${{ (position.settledPayoutUsdc ?? 0).toFixed(2) }} USDC
              </td>

              <td class="py-3 px-4 font-mono font-bold">
                <span :class="(position.realizedPnlUsdc ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                  {{ (position.realizedPnlUsdc ?? 0) >= 0 ? '+' : '' }}${{ (position.realizedPnlUsdc ?? 0).toFixed(2) }}
                </span>
              </td>

              <td class="py-3.5 px-6 font-mono text-slate-500 dark:text-slate-400 text-xs">
                {{ formatLocalDate(position.closedAt ? new Date(position.closedAt).toISOString() : position.endDate) }}
              </td>
            </tr>

            <tr v-if="positionsStore.closedPositions.length === 0">
              <td colspan="7" class="py-14 text-center text-slate-400 text-xs">
                <div class="text-2xl mb-2">🏁</div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Aucune position clôturée pour l'instant</p>
                <p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1 max-w-sm mx-auto">
                  Dès qu'un match sera terminé et résolu par Polymarket, le paiement sera encaissé et archivé ici.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
