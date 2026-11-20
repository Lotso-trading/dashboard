<script setup lang="ts" generic="T extends string">
import AppIcon, { type IconName } from "./AppIcon.vue";

export interface SegmentedOption<TValue extends string = string> {
    value: TValue;
    label: string;
    count?: number;
    icon?: IconName;
    activeClass?: string;
}

defineProps<{
    modelValue: T;
    options: readonly SegmentedOption<T>[];
    size?: "xs" | "sm";
}>();

const emit = defineEmits<(e: "update:modelValue", value: T) => void>();
</script>

<template>
  <div
    class="inline-flex items-center p-1 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 shrink-0"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      @click="emit('update:modelValue', opt.value)"
      :class="[
        'rounded-lg transition font-medium cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap',
        size === 'xs' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        modelValue === opt.value
          ? opt.activeClass ||
            'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
      ]"
    >
      <AppIcon v-if="opt.icon" :name="opt.icon" :size="13" />
      <span>{{ opt.label }}</span>
      <span
        v-if="opt.count !== undefined"
        class="text-[10px] font-mono opacity-80"
      >
        ({{ opt.count }})
      </span>
    </button>
  </div>
</template>
