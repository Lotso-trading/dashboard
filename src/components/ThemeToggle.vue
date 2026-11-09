<script setup lang="ts">
import { useThemeStore } from "../stores/use-theme.store.ts";

const themeStore = useThemeStore();
</script>

<template>
  <div
    class="inline-flex items-center p-0.5 rounded-lg border bg-slate-100 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 text-xs transition-colors"
    role="radiogroup"
    aria-label="Choix du thème"
  >
    <button
      type="button"
      @click="themeStore.setTheme('light')"
      :class="[
        'px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-medium',
        themeStore.theme === 'light'
          ? 'bg-white text-amber-600 shadow-xs dark:bg-slate-800 dark:text-amber-400 font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      ]"
      title="Mode Clair"
    >
      <span class="text-xs">☀️</span>
      <span class="hidden xl:inline text-[11px]">Clair</span>
    </button>

    <button
      type="button"
      @click="themeStore.setTheme('dark')"
      :class="[
        'px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-medium',
        themeStore.theme === 'dark'
          ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400 font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      ]"
      title="Mode Sombre"
    >
      <span class="text-xs">🌙</span>
      <span class="hidden xl:inline text-[11px]">Sombre</span>
    </button>

    <button
      type="button"
      @click="themeStore.setTheme('system')"
      :class="[
        'px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-medium',
        themeStore.theme === 'system'
          ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400 font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      ]"
      title="Thème Automatique (Selon votre système)"
    >
      <span class="text-xs">💻</span>
      <span class="hidden xl:inline text-[11px]">Auto</span>
    </button>
  </div>
</template>
