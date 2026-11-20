<script setup lang="ts">
withDefaults(
    defineProps<{
        modelValue: boolean;
        activeColor?: "emerald" | "amber" | "blue" | "rose";
        size?: "sm" | "md";
        disabled?: boolean;
        title?: string;
    }>(),
    {
        activeColor: "emerald",
        size: "md",
        disabled: false,
    }
);

const emit = defineEmits<(e: "update:modelValue", value: boolean) => void>();

const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-600",
    rose: "bg-rose-600",
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    :title="title"
    @click="emit('update:modelValue', !modelValue)"
    :class="[
      'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
      size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
      modelValue ? colorClasses[activeColor] : 'bg-slate-300 dark:bg-slate-700',
    ]"
  >
    <span
      :class="[
        'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        modelValue
          ? size === 'sm'
            ? 'translate-x-4'
            : 'translate-x-5'
          : 'translate-x-0',
      ]"
    />
  </button>
</template>
