<script setup lang="ts">
import AppBadge, { type BadgeVariant } from "./AppBadge.vue";
import AppIcon, { type IconName } from "./AppIcon.vue";

withDefaults(
    defineProps<{
        label: string;
        value: string;
        subtitle?: string;
        icon?: IconName;
        iconClass?: string;
        valueClass?: string;
        badgeText?: string;
        badgeVariant?: BadgeVariant;
        borderClass?: string;
        progressPercent?: number;
        progressClass?: string;
    }>(),
    {
        iconClass: "text-slate-400 dark:text-slate-500",
        valueClass: "text-slate-900 dark:text-white",
        badgeVariant: "neutral",
        borderClass: "border-slate-200/90 dark:border-slate-800/80",
        progressClass: "bg-emerald-500",
    }
);
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-[#121721] border rounded-2xl p-4 sm:p-5 shadow-xs transition-colors flex flex-col justify-between gap-2',
      borderClass,
    ]"
  >
    <div>
      <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
        <span class="font-medium inline-flex items-center gap-1.5 min-w-0 truncate">
          <AppIcon v-if="icon" :name="icon" :size="14" :class="iconClass" />
          <span class="truncate">{{ label }}</span>
        </span>
        <AppBadge v-if="badgeText" :variant="badgeVariant" size="xs">
          {{ badgeText }}
        </AppBadge>
      </div>

      <div :class="['text-2xl font-bold font-mono tracking-tight', valueClass]">
        {{ value }}
      </div>

      <p v-if="subtitle" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
        {{ subtitle }}
      </p>

      <slot />
    </div>

    <div
      v-if="progressPercent !== undefined"
      class="mt-1 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden"
    >
      <div
        :class="['h-full rounded-full transition-all duration-500', progressClass]"
        :style="{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }"
      />
    </div>
  </div>
</template>
