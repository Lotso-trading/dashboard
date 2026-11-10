<script setup lang="ts">
import { computed } from "vue";
import { wsClient } from "../api/websocket-client.ts";
import { useConfigStore } from "../stores/use-config.store.ts";

const configStore = useConfigStore();

const isApiOnline = computed(() => wsClient.isConnected.value);
const isBotOnline = computed(() => Boolean(configStore.config?.isBotOnline));
const isBotRunning = computed(() => Boolean(configStore.config?.isBotRunning));
const isDryRun = computed(() => Boolean(configStore.config?.dryRun));

const botBadgeLabel = computed(() => {
  if (!isBotOnline.value) {
    return "BOT : HORS LIGNE (OFF)";
  }
  if (!isBotRunning.value) {
    return "BOT : EN PAUSE";
  }
  return "BOT : ACTIF (ON)";
});

const botBadgeClasses = computed(() => {
  if (!isBotOnline.value) {
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20";
  }
  if (!isBotRunning.value) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20";
  }
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20";
});

const botDotClasses = computed(() => {
  if (!isBotOnline.value) {
    return "bg-slate-400 dark:bg-slate-500";
  }
  if (!isBotRunning.value) {
    return "bg-rose-500";
  }
  return "bg-emerald-500 animate-pulse";
});

async function toggleBot(): Promise<void> {
  const current = configStore.config?.isBotRunning ?? true;
  await configStore.updateConfig({
    isBotRunning: !current,
  });
}
</script>

<template>
  <footer
    class="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#070A10]/70 backdrop-blur py-3 px-4 font-mono transition-colors text-xs"
  >
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
      <!-- Badges de télémétrie Système (API, BOT, MODE) -->
      <div class="flex flex-wrap items-center justify-center md:justify-start gap-2">
        <!-- Badge 1 : État API -->
        <span
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition shadow-xs"
          :class="
            isApiOnline
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          "
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isApiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
          ></span>
          API : {{ isApiOnline ? 'EN LIGNE' : 'HORS LIGNE' }}
        </span>

        <!-- Badge 2 : État Bot (Interactif / Toggle) -->
        <button
          type="button"
          @click="toggleBot"
          :class="[
            'px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition cursor-pointer shadow-xs',
            botBadgeClasses,
          ]"
          :title="
            !isBotOnline
              ? 'Le conteneur du bot est arrêté. Cliquer bascule la préférence d\'activation.'
              : isBotRunning
                ? 'Cliquer pour mettre le bot en pause'
                : 'Cliquer pour réactiver le bot'
          "
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="botDotClasses"></span>
          {{ botBadgeLabel }}
        </button>

        <!-- Badge 3 : Mode d'Exécution (DRY-RUN vs LIVE) -->
        <span
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition shadow-xs"
          :class="
            isDryRun
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          "
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isDryRun ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'"
          ></span>
          MODE : {{ isDryRun ? 'DRY-RUN (SIMU)' : 'LIVE CLOB (RÉEL)' }}
        </span>
      </div>

      <!-- Informations terminal & architecture -->
      <div class="text-slate-400 dark:text-slate-500 text-[11px] text-center md:text-right">
        Lotso Terminal • Protocole Furtif Polymarket • Micro-Services Deno 2
      </div>
    </div>
  </footer>
</template>
