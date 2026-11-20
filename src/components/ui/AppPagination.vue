<script setup lang="ts">
import { computed } from "vue";
import { PAGE_SIZE_OPTIONS } from "../../composables/use-pagination.ts";
import AppIcon from "./AppIcon.vue";

const props = withDefaults(
    defineProps<{
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages?: number;
        pageSizeOptions?: readonly number[];
        itemLabel?: string;
    }>(),
    {
        pageSizeOptions: () => [...PAGE_SIZE_OPTIONS],
        itemLabel: "éléments",
    }
);

const emit = defineEmits<{
    (e: "update:page", value: number): void;
    (e: "update:pageSize", value: number): void;
}>();

const computedTotalPages = computed(() =>
    Math.max(1, props.totalPages ?? Math.ceil(props.totalItems / Math.max(1, props.pageSize)))
);

const rangeStart = computed(() => {
    if (props.totalItems === 0) return 0;
    return (props.page - 1) * props.pageSize + 1;
});

const rangeEnd = computed(() => {
    if (props.totalItems === 0) return 0;
    return Math.min(props.totalItems, props.page * props.pageSize);
});

const visiblePages = computed<Array<number | "...">>(() => {
    const total = computedTotalPages.value;
    const current = props.page;
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: Array<number | "..."> = [1];
    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) {
        pages.push(p);
    }

    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
});

function goToPage(nextPage: number): void {
    const safe = Math.min(computedTotalPages.value, Math.max(1, nextPage));
    if (safe !== props.page) {
        emit("update:page", safe);
    }
}

function handlePageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextSize = Number(select.value);
    if (!Number.isNaN(nextSize) && nextSize > 0 && nextSize !== props.pageSize) {
        emit("update:pageSize", nextSize);
    }
}
</script>

<template>
  <div
    class="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
  >
    <!-- Résumé et sélecteur de taille de page -->
    <div class="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
      <span class="font-mono whitespace-nowrap">
        <template v-if="totalItems > 0">
          <strong class="text-slate-900 dark:text-white">{{ rangeStart }}–{{ rangeEnd }}</strong>
          sur
          <strong class="text-slate-900 dark:text-white">{{ totalItems }}</strong>
          {{ itemLabel }}
        </template>
        <template v-else>
          0 {{ itemLabel }}
        </template>
      </span>

      <label class="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span class="text-[11px]">Par page :</span>
        <select
          :value="pageSize"
          @change="handlePageSizeChange"
          aria-label="Nombre d'éléments par page"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
    </div>

    <!-- Contrôles de pages -->
    <nav class="flex items-center gap-1" aria-label="Pagination">
      <button
        type="button"
        @click="goToPage(1)"
        :disabled="page <= 1"
        title="Première page"
        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <AppIcon name="chevrons-left" :size="14" />
      </button>

      <button
        type="button"
        @click="goToPage(page - 1)"
        :disabled="page <= 1"
        title="Page précédente"
        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <AppIcon name="chevron-left" :size="14" />
      </button>

      <template v-for="(item, idx) in visiblePages" :key="`${item}-${idx}`">
        <span
          v-if="item === '...'"
          class="px-1.5 text-slate-400 font-mono select-none"
        >
          ...
        </span>
        <button
          v-else
          type="button"
          @click="goToPage(item)"
          :class="[
            'min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer',
            item === page
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
          ]"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        @click="goToPage(page + 1)"
        :disabled="page >= computedTotalPages"
        title="Page suivante"
        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <AppIcon name="chevron-right" :size="14" />
      </button>

      <button
        type="button"
        @click="goToPage(computedTotalPages)"
        :disabled="page >= computedTotalPages"
        title="Dernière page"
        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <AppIcon name="chevrons-right" :size="14" />
      </button>
    </nav>
  </div>
</template>
