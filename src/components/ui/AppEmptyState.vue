<script setup lang="ts">
import AppIcon, { type IconName } from "./AppIcon.vue";

withDefaults(
    defineProps<{
        title: string;
        description?: string;
        icon?: IconName;
    }>(),
    {
        icon: "layers",
    }
);
</script>

<template>
  <div class="py-12 px-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
    <div
      class="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-1"
    >
      <AppIcon :name="icon" :size="20" />
    </div>
    <p class="font-semibold text-slate-700 dark:text-slate-200 text-sm">
      {{ title }}
    </p>
    <p v-if="description" class="text-xs text-slate-500 dark:text-slate-400 max-w-md">
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="mt-3 flex flex-wrap items-center justify-center gap-2.5">
      <slot name="actions" />
    </div>
  </div>
</template>
