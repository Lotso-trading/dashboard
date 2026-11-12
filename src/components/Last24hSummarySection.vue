<script setup lang="ts">
import type { OpenPosition } from "@polymarket-copy/shared";
import { computed } from "vue";
import { usePositionsStore } from "../stores/use-positions.store.ts";
import {
  type ClosedPositionsTotals,
  calculatePositionsSummary,
  filterPositionsLast24h,
} from "../utils/positions-summary.ts";

const emit = defineEmits<(e: "navigate", tab: "CLOSED_JOURNAL") => void>();

const positionsStore = usePositionsStore();

const positions24h = computed<OpenPosition[]>(() => {
  return filterPositionsLast24h(positionsStore.closedPositions);
});

const summary24h = computed<ClosedPositionsTotals>(() => {
  return calculatePositionsSummary(positions24h.value);
});

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
            {{ positions24h.length }} RÉSOLUTION{{ positions24h.length > 1 ? 'S' : '' }}
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Marchés résolus par l'oracle Polymarket et bénéfices nets encaissés sur les 24 dernières heures
        </p>
      </div>

      <!-- Bouton CTA vers le Journal Exhaustif -->
      <button
        type="button"
        @click="emit('navigate', 'CLOSED_JOURNAL')"
        class="px-3.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer group"
      >
        <span>📜 Journal Exhaustif Complet</span>
        <span class="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </div>

    <!-- Grille des 4 KPIs 24h -->
    <div class="p-6 bg-slate-50/60 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- 1. Bilan Net 24h -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>⚖️</span> Gain Net 24h
            </span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
              :class="summary24h.netPnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
            >
              {{ summary24h.roiPercent >= 0 ? '+' : '' }}{{ summary24h.roiPercent.toFixed(1) }} %
            </span>
          </div>
          <div
            class="text-xl font-bold font-mono tracking-tight"
            :class="summary24h.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ summary24h.netPnl >= 0 ? '+' : '' }}${{ summary24h.netPnl.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Profits nets réalisés sur 24h
          </p>
        </div>

        <!-- 2. Taux de Réussite 24h -->
        <div class="bg-white dark:bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🏆</span> Taux Victoire 24h
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              +{{ summary24h.winCount }}W / -{{ summary24h.lossCount }}L
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {{ summary24h.winRate.toFixed(1) }} %
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Sur {{ summary24h.count }} position{{ summary24h.count > 1 ? 's' : '' }} clôturée{{ summary24h.count > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- 3. Mises Engagées 24h -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🎯</span> Mises Engagées 24h
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
              VOLUME
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ summary24h.totalInvested.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Total investi sur les résolutions 24h
          </p>
        </div>

        <!-- 4. Payout Reçu 24h -->
        <div class="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>💰</span> Payout Reçu 24h
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
              ENCAISSÉ
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ summary24h.totalPayout.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Racheté 1,00 $ / part par Polymarket
          </p>
        </div>
      </div>
    </div>

    <!-- Tableau des résolutions 24h OU Empty State -->
    <div v-if="positions24h.length > 0" class="overflow-x-auto">
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
            v-for="pos in positions24h"
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
                Clôturé aujourd'hui à {{ formatTime(pos.closedAt || pos.updatedAt) }} ({{ formatDate(pos.closedAt || pos.updatedAt) }})
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

    <!-- Empty State quand aucune clôture sur 24h -->
    <div v-else class="py-12 px-6 text-center text-slate-400 text-xs">
      <div class="text-3xl mb-2">⚡</div>
      <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
        Aucune position clôturée au cours des 24 dernières heures
      </p>
      <p class="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-md mx-auto">
        Dès qu'un match en cours est résolu par l'oracle Polymarket, son règlement apparaîtra immédiatement ici avec ses gains associés.
      </p>
      <div class="mt-4">
        <button
          type="button"
          @click="emit('navigate', 'CLOSED_JOURNAL')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          <span>📜 Consulter l'historique complet dans le Journal Exhaustif</span>
          <span>→</span>
        </button>
      </div>
    </div>

    <!-- Bandeau Bas de redirection vers la page dédiée -->
    <div class="px-6 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      <span class="text-slate-500 dark:text-slate-400">
        Historique global : <strong class="text-slate-900 dark:text-white">{{ positionsStore.closedPositions.length }}</strong> positions archivées au total.
      </span>
      <button
        type="button"
        @click="emit('navigate', 'CLOSED_JOURNAL')"
        class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1 group cursor-pointer"
      >
        <span>Accéder au Journal Exhaustif avec défilement infini</span>
        <span class="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </div>
  </div>
</template>
