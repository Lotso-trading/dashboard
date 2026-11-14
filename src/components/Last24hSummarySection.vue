<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL") => void>();

const store = useLast24hSummaryStore();
const sentinelEl = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function formatTime(timestamp?: number): string {
  if (!timestamp) return "—";
  const ms = timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  const ms = timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setupObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (typeof IntersectionObserver !== "undefined" && sentinelEl.value) {
    observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && store.hasMore && !store.isLoadingMore && !store.isLoading) {
          store.loadMore();
        }
      },
      {
        rootMargin: "200px",
      }
    );
    observer.observe(sentinelEl.value);
  }
}

onMounted(async () => {
  await store.loadInitial("24H", "ALL");
  setupObserver();
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl overflow-hidden shadow-xs transition-colors">
    <!-- En-tête de la section 24h -->
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-lg">⚡</span>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">
            Résumé des Dernières 24 Heures
          </h4>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold">
            {{ store.total }} {{ store.timeWindow === '24H' ? 'RÉSOLUTION' : 'POSITION' }}{{ store.total > 1 ? 'S' : '' }}
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
            DÉFILEMENT INFINI ACTIF
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{ store.timeWindow === '24H'
            ? "Marchés résolus par l'oracle Polymarket et bénéfices nets encaissés sur les 24 dernières heures"
            : "Historique global complet sans limite • Défilement infini activé" }}
        </p>
      </div>

      <!-- Contrôles : Scope Temporel & Filtres d'Issues -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Scope : 24h vs Tout l'historique -->
        <div class="inline-flex items-center p-1 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 text-xs">
          <button
            type="button"
            @click="store.setTimeWindow('24H')"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium cursor-pointer text-[11px] flex items-center gap-1',
              store.timeWindow === '24H'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>⚡</span> 24h
          </button>
          <button
            type="button"
            @click="store.setTimeWindow('ALL_TIME')"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium cursor-pointer text-[11px] flex items-center gap-1',
              store.timeWindow === 'ALL_TIME'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>🌐</span> Tout l'historique
          </button>
        </div>

        <!-- Filtres Win / Loss -->
        <div class="inline-flex items-center p-1 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 text-xs">
          <button
            type="button"
            @click="store.setFilterStatus('ALL')"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium cursor-pointer text-[11px]',
              store.filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Tous ({{ store.total }})
          </button>
          <button
            type="button"
            @click="store.setFilterStatus('WIN')"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium cursor-pointer text-[11px]',
              store.filterStatus === 'WIN'
                ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Victoires ({{ store.currentTotals.winCount }})
          </button>
          <button
            type="button"
            @click="store.setFilterStatus('LOSS')"
            :class="[
              'px-2.5 py-1 rounded-lg transition font-medium cursor-pointer text-[11px]',
              store.filterStatus === 'LOSS'
                ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            Défaites ({{ store.currentTotals.lossCount }})
          </button>
        </div>

        <!-- Bouton CTA vers le Journal Exhaustif -->
        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer group"
        >
          <span>📜 Vue Journal Dédiée</span>
          <span class="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </div>

    <!-- Grille des 4 KPIs 24h (ou Sélection) -->
    <div class="p-6 bg-slate-50/60 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- 1. Bilan Net -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>⚖️</span> Gain Net {{ store.timeWindow === '24H' ? '24h' : 'Total' }}
            </span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
              :class="store.currentTotals.netPnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
            >
              {{ store.currentTotals.roiPercent >= 0 ? '+' : '' }}{{ store.currentTotals.roiPercent.toFixed(1) }} %
            </span>
          </div>
          <div
            class="text-xl font-bold font-mono tracking-tight"
            :class="store.currentTotals.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ store.currentTotals.netPnl >= 0 ? '+' : '' }}${{ store.currentTotals.netPnl.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            {{ store.timeWindow === '24H' ? 'Profits nets réalisés sur 24h' : 'Profits nets cumulés sur la sélection' }}
          </p>
        </div>

        <!-- 2. Taux de Réussite -->
        <div class="bg-white dark:bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🏆</span> Taux Victoire {{ store.timeWindow === '24H' ? '24h' : 'Total' }}
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              +{{ store.currentTotals.winCount }}W / -{{ store.currentTotals.lossCount }}L
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {{ store.currentTotals.winRate.toFixed(1) }} %
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Sur {{ store.currentTotals.count }} position{{ store.currentTotals.count > 1 ? 's' : '' }} clôturée{{ store.currentTotals.count > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- 3. Mises Engagées -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🎯</span> Mises Engagées {{ store.timeWindow === '24H' ? '24h' : 'Total' }}
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
              VOLUME
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ store.currentTotals.totalInvested.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            {{ store.timeWindow === '24H' ? 'Total investi sur les résolutions 24h' : 'Total investi sur l\'historique filtré' }}
          </p>
        </div>

        <!-- 4. Payout Reçu -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>💰</span> Payout Reçu {{ store.timeWindow === '24H' ? '24h' : 'Total' }}
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
              ENCAISSÉ
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ store.currentTotals.totalPayout.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Racheté 1,00 $ / part par Polymarket
          </p>
        </div>
      </div>
    </div>

    <!-- Tableau des résolutions avec Défilement Infini Sans Limite -->
    <div v-if="store.items.length > 0" class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th class="py-3 px-6">Marché Résolu</th>
            <th class="py-3 px-4">Issue</th>
            <th class="py-3 px-4">Parts</th>
            <th class="py-3 px-4">Mise</th>
            <th class="py-3 px-4">Payout</th>
            <th class="py-3 px-4">Gain Net (PnL)</th>
            <th class="py-3 px-6 text-right">Résultat</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
          <tr
            v-for="pos in store.items"
            :key="pos.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
          >
            <td class="py-3 px-6 font-sans">
              <a
                :href="`https://polymarket.com/event/${pos.marketSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 flex items-center gap-1.5"
              >
                {{ pos.marketQuestion }}
                <span class="text-[10px] text-slate-400">↗</span>
              </a>
              <span class="text-[11px] text-slate-400 font-sans block mt-0.5">
                Clôturé à {{ formatTime(pos.closedAt || pos.updatedAt) }} ({{ formatDate(pos.closedAt || pos.updatedAt) }})
              </span>
            </td>

            <td class="py-3 px-4 font-sans">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {{ pos.outcomeLabel }}
              </span>
            </td>

            <td class="py-3 px-4 text-slate-900 dark:text-white">
              {{ pos.totalShares.toFixed(2) }}
            </td>

            <td class="py-3 px-4">
              ${{ (pos.totalInvestedUsdc || 0).toFixed(2) }}
            </td>

            <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">
              ${{ (pos.settledPayoutUsdc || 0).toFixed(2) }}
            </td>

            <td
              class="py-3 px-4 font-bold"
              :class="(pos.realizedPnlUsdc ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ (pos.realizedPnlUsdc ?? 0) >= 0 ? '+' : '' }}${{ (pos.realizedPnlUsdc ?? 0).toFixed(2) }}
            </td>

            <td class="py-3 px-6 text-right font-sans">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                :class="pos.closeReason === 'RESOLVED_WIN'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'"
              >
                {{ pos.closeReason === 'RESOLVED_WIN' ? '🏆 VICTOIRE' : '❌ DÉFAITE' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State quand aucune clôture -->
    <div v-else-if="!store.isLoading" class="py-12 px-6 text-center text-slate-400 text-xs">
      <div class="text-3xl mb-2">⚡</div>
      <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
        {{ store.timeWindow === '24H'
          ? 'Aucune position clôturée au cours des 24 dernières heures'
          : 'Aucune position trouvée dans l\'historique avec ces critères' }}
      </p>
      <p class="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-md mx-auto">
        {{ store.timeWindow === '24H'
          ? 'Dès qu\'un match en cours est résolu par l\'oracle Polymarket, son règlement apparaîtra immédiatement ici avec ses gains associés.'
          : 'Modifiez vos filtres pour visualiser d\'autres enregistrements.' }}
      </p>
      <div class="mt-4 flex items-center justify-center gap-3">
        <button
          v-if="store.timeWindow === '24H'"
          type="button"
          @click="store.setTimeWindow('ALL_TIME')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-750 text-xs font-semibold transition cursor-pointer shadow-xs"
        >
          <span>🌐 Consulter tout l'historique sans limite (défilement infini)</span>
          <span>→</span>
        </button>
        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          <span>📜 Ouvrir le Journal Exhaustif</span>
          <span>→</span>
        </button>
      </div>
    </div>

    <!-- Sentinel & Loader Infinite Scroll -->
    <div
      ref="sentinelEl"
      class="py-4 px-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20 text-center"
    >
      <div v-if="store.isLoadingMore || store.isLoading" class="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span class="animate-spin text-base">🔄</span>
        <span>Chargement des positions suivantes...</span>
      </div>

      <div v-else-if="!store.hasMore && store.items.length > 0" class="space-y-2">
        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <span class="text-emerald-500 font-bold">✓</span>
          <span v-if="store.timeWindow === '24H'">
            L'ensemble des <strong>{{ store.total }}</strong> résolutions des dernières 24h a été chargé sans limite.
          </span>
          <span v-else>
            Fin de l'historique : les <strong>{{ store.total }}</strong> positions archivées ont toutes été chargées.
          </span>
        </div>

        <!-- Si l'utilisateur est en 24h et a fini de charger les 24h, bouton pour continuer à défiler dans l'historique complet -->
        <div v-if="store.timeWindow === '24H'" class="pt-1">
          <button
            type="button"
            @click="store.setTimeWindow('ALL_TIME')"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <span>📜 Poursuivre le défilement dans l'historique complet (défilement infini sans limite)</span>
            <span>↓</span>
          </button>
        </div>
      </div>

      <div v-else-if="store.hasMore" class="text-[11px] text-slate-400">
        Faites défiler vers le bas pour charger plus... ({{ store.items.length }} sur {{ store.total }} affichées)
      </div>
    </div>

    <!-- Bandeau Bas d'information -->
    <div class="px-6 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      <span class="text-slate-500 dark:text-slate-400">
        Positions affichées : <strong class="text-slate-900 dark:text-white">{{ store.items.length }}</strong> sur un total disponible de <strong class="text-slate-900 dark:text-white">{{ store.total }}</strong>.
      </span>
      <button
        type="button"
        @click="emit('navigate', 'CLOSED_JOURNAL')"
        class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1 group cursor-pointer"
      >
        <span>Accéder à la vue dédiée du Journal Exhaustif</span>
        <span class="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </div>
  </div>
</template>
