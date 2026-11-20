<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";

defineProps<{
    title: string;
    subtitle?: string;
    icon?: IconName;
    iconClass?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 transition-colors"
  >
    <div class="min-w-0">
      <slot name="before-title" />
      <div class="flex items-center flex-wrap gap-2.5">
        <div
          v-if="icon"
          :class="[
            'h-9 w-9 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0',
            iconClass,
          ]"
        >
          <AppIcon :name="icon" :size="18" />
        </div>
        <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
          {{ title }}
        </h2>
        <slot name="badges" />
      </div>
      <p v-if="subtitle" class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        {{ subtitle }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2.5 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
