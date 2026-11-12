<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useClosedJournalStore } from "../stores/use-closed-journal.store.ts";

const emit = defineEmits<{
  (e: "navigate", tab: "SYNTHESIS"): void;
}>();

const journalStore = useClosedJournalStore();
const sentinelEl = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  const ms = timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function changeFilter(status: "ALL" | "WIN" | "LOSS"): Promise<void> {
  await journalStore.loadInitial(status);
}

onMounted(async () => {
  await journalStore.loadInitial("ALL");

  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && journalStore.hasMore && !journalStore.isLoadingMore && !journalStore.isLoading) {
          journalStore.loadMore();
        }
      },
      {
        rootMargin: "200px",
      }
    );

    if (sentinelEl.value) {
      observer.observe(sentinelEl.value);
    }
  }
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- Barre de retour et En-tête -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <button
            type="button"
            @click="emit('navigate', 'SYNTHESIS')"
            class="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>←</span> Revenir à la Synthèse Financière
          </button>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">📜</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            Journal Exhaustif des Positions Clôturées
          </h2>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            {{ journalStore.total }} ARCHIVES
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Grand livre historique complet des arbitrages résolus par l'oracle Polymarket • Défilement infini et filtres dynamiques
        </p>
      </div>

      <!-- Filtres Win / Loss -->
      <div class="inline-flex items-center p-1 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 text-xs shrink-0 self-start sm:self-auto">
        <button
          type="button"
          @click="changeFilter('ALL')"
          :class="[
            'px-3.5 py-1.5 rounded-lg transition font-medium cursor-pointer',
            journalStore.filterStatus === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Tous ({{ journalStore.filterStatus === 'ALL' ? journalStore.total : journalStore.totals.count }})
        </button>
        <button
          type="button"
          @click="changeFilter('WIN')"
          :class="[
            'px-3.5 py-1.5 rounded-lg transition font-medium cursor-pointer',
            journalStore.filterStatus === 'WIN'
              ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-800 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Victoires ({{ journalStore.totals.winCount }})
        </button>
        <button
          type="button"
          @click="changeFilter('LOSS')"
          :class="[
            'px-3.5 py-1.5 rounded-lg transition font-medium cursor-pointer',
            journalStore.filterStatus === 'LOSS'
              ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          Défaites ({{ journalStore.totals.lossCount }})
        </button>
      </div>
    </div>

    <!-- Bandeau Synthèse des Marchés (Totaux Globaux Cumulés) -->
    <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl p-5 shadow-xs transition-colors">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- 1. Payout Reçu -->
        <div class="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>💰</span> Payout Reçu
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
              ENCAISSÉ
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            ${{ journalStore.totals.totalPayout.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Montant brut racheté par Polymarket
          </p>
        </div>

        <!-- 2. Total Gains (Victoires) -->
        <div class="bg-slate-50/70 dark:bg-slate-950/40 border border-emerald-500/20 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🟢</span> Gains Cumulés
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              +{{ journalStore.totals.winCount }} WINS
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            +${{ journalStore.totals.totalGains.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Profits nets des paris victorieux
          </p>
        </div>

        <!-- 3. Total Pertes (Défaites) -->
        <div class="bg-slate-50/70 dark:bg-slate-950/40 border border-rose-500/20 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>🔴</span> Pertes Cumulées
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold">
              -{{ journalStore.totals.lossCount }} LOSS
            </span>
          </div>
          <div class="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            -${{ journalStore.totals.totalLosses.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Mises perdues sur résolutions contraires
          </p>
        </div>

        <!-- 4. Résultat Net (PnL) -->
        <div class="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span class="font-medium flex items-center gap-1.5">
              <span>⚖️</span> Bilan Net (PnL)
            </span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
              :class="journalStore.totals.netPnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
            >
              {{ journalStore.totals.roiPercent >= 0 ? '+' : '' }}{{ journalStore.totals.roiPercent.toFixed(1) }} %
            </span>
          </div>
          <div
            class="text-xl font-bold font-mono tracking-tight"
            :class="journalStore.totals.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ journalStore.totals.netPnl >= 0 ? '+' : '' }}${{ journalStore.totals.netPnl.toFixed(2) }}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            Sur ${{ journalStore.totals.totalInvested.toFixed(2) }} misés ({{ journalStore.totals.winRate.toFixed(1) }}% Victoires)
          </p>
        </div>
      </div>
    </div>

    <!-- Table Exhaustive avec Infinite Scroll -->
    <div class="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200/90 dark:border-slate-800/70 rounded-2xl overflow-hidden shadow-xs transition-colors">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📑</span> Liste Complète des Positions Clôturées
          <span class="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
            ({{ journalStore.items.length }} affichée{{ journalStore.items.length > 1 ? 's' : '' }} sur {{ journalStore.total }})
          </span>
        </h4>
        <span class="text-xs text-slate-400">
          Défilez vers le bas pour charger automatiquement la suite
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3 px-6">Marché / Événement</th>
              <th class="py-3 px-4">Issue</th>
              <th class="py-3 px-4">Parts</th>
              <th class="py-3 px-4">Mise Engagée</th>
              <th class="py-3 px-4">Prix Moyen</th>
              <th class="py-3 px-4">Payout Reçu</th>
              <th class="py-3 px-4">Gain Net (PnL)</th>
              <th class="py-3 px-6 text-right">Résultat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
            <tr
              v-for="pos in journalStore.items"
              :key="pos.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition"
            >
              <td class="py-3.5 px-6 font-sans">
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
                  Clôturé le {{ formatDate(pos.closedAt || pos.updatedAt) }}
                </span>
              </td>

              <td class="py-3.5 px-4 font-sans">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {{ pos.outcomeLabel }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-slate-900 dark:text-white">
                {{ pos.totalShares.toFixed(2) }}
              </td>

              <td class="py-3.5 px-4">
                ${{ (pos.totalInvestedUsdc || 0).toFixed(2) }}
              </td>

              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                ${{ (pos.avgEntryPrice || 0).toFixed(3) }}
              </td>

              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                ${{ (pos.settledPayoutUsdc || 0).toFixed(2) }}
              </td>

              <td
                class="py-3.5 px-4 font-bold"
                :class="(pos.realizedPnlUsdc ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
                {{ (pos.realizedPnlUsdc ?? 0) >= 0 ? '+' : '' }}${{ (pos.realizedPnlUsdc ?? 0).toFixed(2) }}
              </td>

              <td class="py-3.5 px-6 text-right font-sans">
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

            <!-- Empty State -->
            <tr v-if="!journalStore.isLoading && journalStore.items.length === 0">
              <td colspan="8" class="py-14 text-center text-slate-400 text-xs font-sans">
                <div class="text-3xl mb-2">🏁</div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Aucune position clôturée pour ce filtre</p>
                <p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                  Sélectionnez un autre filtre pour visualiser d'autres résultats.
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Pied de table / Totalisation des éléments affichés -->
          <tfoot
            v-if="journalStore.items.length > 0"
            class="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/80 font-mono text-xs font-bold text-slate-900 dark:text-white"
          >
            <tr>
              <td class="py-3.5 px-6 font-sans">
                <div class="flex items-center gap-2">
                  <span>📊 TOTAL CUMULÉ DU JOURNAL</span>
                  <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                    ({{ journalStore.totals.count }} marché{{ journalStore.totals.count > 1 ? 's' : '' }})
                  </span>
                </div>
              </td>
              <td class="py-3.5 px-4 font-sans text-slate-400">—</td>
              <td class="py-3.5 px-4">{{ journalStore.totals.totalShares.toFixed(2) }}</td>
              <td class="py-3.5 px-4">${{ journalStore.totals.totalInvested.toFixed(2) }}</td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                ${{ journalStore.totals.avgEntryPrice.toFixed(3) }}
              </td>
              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                ${{ journalStore.totals.totalPayout.toFixed(2) }}
              </td>
              <td
                class="py-3.5 px-4 font-bold"
                :class="journalStore.totals.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
                {{ journalStore.totals.netPnl >= 0 ? '+' : '' }}${{ journalStore.totals.netPnl.toFixed(2) }}
              </td>
              <td class="py-3.5 px-6 text-right font-sans">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  :class="journalStore.totals.winRate >= 50
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'"
                >
                  {{ journalStore.totals.winRate.toFixed(1) }}% Victoires
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Sentinel & Infinite Scroll Loader / Status -->
      <div ref="sentinelEl" class="py-6 px-4 text-center border-t border-slate-100 dark:border-slate-800/60">
        <div v-if="journalStore.isLoadingMore || journalStore.isLoading" class="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span class="animate-spin text-base">🔄</span>
          <span>Chargement des positions suivantes...</span>
        </div>
        <div v-else-if="!journalStore.hasMore && journalStore.items.length > 0" class="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <span>✓</span>
          <span>Fin du journal : l'ensemble des <strong>{{ journalStore.total }}</strong> positions clôturées a été chargé.</span>
        </div>
        <div v-else-if="journalStore.hasMore" class="text-[11px] text-slate-400">
          Faites défiler pour charger plus...
        </div>
      </div>
    </div>
  </div>
</template>
