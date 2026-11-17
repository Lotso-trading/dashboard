<script setup lang="ts">
import FooterStatus from "./components/FooterStatus.vue";
import HeaderNavbar from "./components/HeaderNavbar.vue";
import DashboardView from "./views/DashboardView.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#07090e] dark:text-slate-100 transition-colors duration-200">
    <HeaderNavbar />
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <DashboardView />
    </main>
    <FooterStatus />
  </div>
</template>
