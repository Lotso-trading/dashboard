<script setup lang="ts">
import { computed } from "vue";
import AppIcon, { type IconName } from "./AppIcon.vue";

export type BadgeVariant =
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "neutral"
    | "brand"
    | "indigo";

const props = withDefaults(
    defineProps<{
        variant?: BadgeVariant;
        size?: "xs" | "sm";
        icon?: IconName;
        dot?: boolean;
        pulse?: boolean;
        truncate?: boolean;
        title?: string;
        rounded?: "md" | "full";
    }>(),
    {
        variant: "neutral",
        size: "xs",
        dot: false,
        pulse: false,
        truncate: false,
        rounded: "full",
    }
);

const variantClasses = computed(() => {
    switch (props.variant) {
        case "success":
            return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
        case "danger":
            return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
        case "warning":
            return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
        case "info":
            return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
        case "brand":
            return "bg-rose-600/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
        case "indigo":
            return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
        default:
            return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
});

const dotClasses = computed(() => {
    switch (props.variant) {
        case "success":
            return "bg-emerald-500";
        case "danger":
            return "bg-rose-500";
        case "warning":
            return "bg-amber-500";
        case "info":
            return "bg-blue-500";
        case "brand":
            return "bg-rose-500";
        case "indigo":
            return "bg-indigo-500";
        default:
            return "bg-slate-400 dark:bg-slate-500";
    }
});
</script>

<template>
  <span
    :title="title"
    :class="[
      'inline-flex items-center gap-1 border font-mono font-semibold whitespace-nowrap shrink-0 leading-none select-none',
      rounded === 'full' ? 'rounded-full' : 'rounded-md',
      size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
      variantClasses,
    ]"
  >
    <span
      v-if="dot"
      :class="['h-1.5 w-1.5 rounded-full shrink-0', dotClasses, pulse ? 'animate-pulse' : '']"
    />
    <AppIcon v-if="icon" :name="icon" :size="size === 'xs' ? 11 : 12" />
    <span :class="truncate ? 'max-w-[130px] truncate' : ''">
      <slot />
    </span>
  </span>
</template>
