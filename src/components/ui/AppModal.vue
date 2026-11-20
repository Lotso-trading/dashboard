<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import AppIcon, { type IconName } from "./AppIcon.vue";

withDefaults(
    defineProps<{
        title: string;
        subtitle?: string;
        icon?: IconName;
        maxWidthClass?: string;
    }>(),
    {
        maxWidthClass: "max-w-md",
    }
);

const emit = defineEmits<(e: "close") => void>();

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        emit("close");
    }
}

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      :class="[
        'bg-white dark:bg-[#121721] border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full p-6 shadow-2xl relative transition-colors',
        maxWidthClass,
      ]"
    >
      <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-start gap-2.5 min-w-0">
          <div
            v-if="icon"
            class="h-8 w-8 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5"
          >
            <AppIcon :name="icon" :size="16" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center flex-wrap gap-2">
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                {{ title }}
              </h3>
              <slot name="badge" />
            </div>
            <p v-if="subtitle" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ subtitle }}
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Fermer"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>

      <div class="mt-4">
        <slot />
      </div>
    </div>
  </div>
</template>
