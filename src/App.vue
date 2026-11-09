<script setup lang="ts">
import HeaderNavbar from "./components/HeaderNavbar.vue";
import DashboardView from "./views/DashboardView.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#07090e] dark:text-slate-100 transition-colors duration-200">
    <HeaderNavbar />
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <DashboardView />
    </main>
    <footer class="border-t border-slate-200 dark:border-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors">
      Copy-Trading Engine • Micro-Services Conteneurisés Deno 2 • Zero Any
    </footer>
  </div>
</template>
