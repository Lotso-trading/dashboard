<script setup lang="ts">
import type { SortOrder } from "@lotso-trading/shared";
import AppIcon from "./AppIcon.vue";

const props = withDefaults(
    defineProps<{
        label: string;
        field: string;
        activeField: string;
        sortOrder: SortOrder;
        align?: "left" | "right";
    }>(),
    {
        align: "left",
    }
);

const emit = defineEmits<(e: "sort", field: string) => void>();

const isActive = () => props.activeField === props.field;
</script>

<template>
  <th
    @click="emit('sort', field)"
    :class="[
      'py-3 px-4 cursor-pointer select-none whitespace-nowrap hover:text-slate-900 dark:hover:text-white transition group',
      align === 'right' ? 'text-right' : 'text-left',
      isActive() ? 'text-rose-600 dark:text-rose-400' : '',
    ]"
  >
    <div
      :class="[
        'inline-flex items-center gap-1',
        align === 'right' ? 'justify-end' : 'justify-start',
      ]"
    >
      <span>{{ label }}</span>
      <AppIcon
        v-if="isActive() && sortOrder === 'asc'"
        name="arrow-up"
        :size="13"
        class="text-rose-600 dark:text-rose-400"
      />
      <AppIcon
        v-else-if="isActive() && sortOrder === 'desc'"
        name="arrow-down"
        :size="13"
        class="text-rose-600 dark:text-rose-400"
      />
      <AppIcon
        v-else
        name="arrow-up-down"
        :size="12"
        class="opacity-40 group-hover:opacity-100 transition-opacity"
      />
    </div>
  </th>
</template>
