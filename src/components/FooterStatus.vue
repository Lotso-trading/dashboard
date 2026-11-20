<script setup lang="ts">
import { computed } from "vue";
import { wsClient } from "../api/websocket-client.ts";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useSystemStore } from "../stores/use-system.store.ts";
import AppBadge, { type BadgeVariant } from "./ui/AppBadge.vue";
import AppIcon from "./ui/AppIcon.vue";

const configStore = useConfigStore();
const systemStore = useSystemStore();

const isApiOnline = computed(() => wsClient.isConnected.value);
const isBotOnline = computed(
    () => Boolean(configStore.config?.isBotOnline) || Boolean(systemStore.versions.botOnline)
);
const isBotRunning = computed(() => Boolean(configStore.config?.isBotRunning));
const isDryRun = computed(() => Boolean(configStore.config?.dryRun));

const apiVersionLabel = computed(() => {
    const v = systemStore.versions.api;
    return v && v !== "—" ? `v${v}` : "";
});

const botVersionLabel = computed(() => {
    const v = systemStore.versions.bot;
    return v ? `v${v}` : "";
});

const sharedVersionLabel = computed(() => {
    const v = systemStore.versions.shared;
    return v && v !== "—" ? `v${v}` : "—";
});

const botStatusLabel = computed(() => {
    if (!isBotOnline.value) return "Bot : Hors ligne";
    if (!isBotRunning.value) return "Bot : Pause";
    return "Bot : Actif";
});

const botVariant = computed<BadgeVariant>(() => {
    if (!isBotOnline.value) return "neutral";
    if (!isBotRunning.value) return "danger";
    return "success";
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
    class="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#070A10]/80 backdrop-blur py-3 px-4 font-mono transition-colors text-xs"
  >
    <div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
      <!-- Statuts & Versions des services -->
      <div class="flex flex-wrap items-center justify-center lg:justify-start gap-2">
        <!-- API Status + Version -->
        <AppBadge
          :variant="isApiOnline ? 'success' : 'danger'"
          size="sm"
          rounded="md"
          :dot="true"
          :pulse="isApiOnline"
        >
          API : {{ isApiOnline ? "En ligne" : "Hors ligne" }}
          <template v-if="apiVersionLabel"> · {{ apiVersionLabel }}</template>
        </AppBadge>

        <!-- Bot Status + Version (Toggle interactif) -->
        <button
          type="button"
          @click="toggleBot"
          class="cursor-pointer focus:outline-none"
          :title="
            !isBotOnline
              ? 'Conteneur bot arrêté. Cliquer bascule la préférence d\'activation.'
              : isBotRunning
                ? 'Cliquer pour mettre le bot en pause'
                : 'Cliquer pour réactiver le bot'
          "
        >
          <AppBadge
            :variant="botVariant"
            size="sm"
            rounded="md"
            :dot="true"
            :pulse="isBotOnline && isBotRunning"
          >
            {{ botStatusLabel }}
            <template v-if="botVersionLabel"> · {{ botVersionLabel }}</template>
          </AppBadge>
        </button>

        <!-- Shared Version -->
        <AppBadge variant="indigo" size="sm" rounded="md" icon="package">
          Shared : {{ sharedVersionLabel }}
        </AppBadge>

        <!-- Mode d'exécution -->
        <AppBadge
          :variant="isDryRun ? 'warning' : 'success'"
          size="sm"
          rounded="md"
          :dot="true"
          :pulse="!isDryRun"
        >
          Mode : {{ isDryRun ? "Simu" : "Live" }}
        </AppBadge>
      </div>

      <!-- Version du Dashboard à droite -->
      <div
        class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-semibold whitespace-nowrap"
      >
        <AppIcon name="cpu" :size="13" class="text-rose-500" />
        <span>Lotso - v{{ systemStore.dashboardVersion }}</span>
      </div>
    </div>
  </footer>
</template>
