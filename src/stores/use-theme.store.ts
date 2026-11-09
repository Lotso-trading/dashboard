import { defineStore } from "pinia";
import { computed, onMounted, ref } from "vue";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "pm_theme_preference";

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<ThemePreference>("system");
  const systemPrefersDark = ref(true);

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
      theme.value = saved;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark.value = mediaQuery.matches;

    mediaQuery.addEventListener("change", (e) => {
      systemPrefersDark.value = e.matches;
      if (theme.value === "system") {
        applyTheme(systemPrefersDark.value);
      }
    });
  }

  const effectiveTheme = computed<"light" | "dark">(() => {
    if (theme.value === "system") {
      return systemPrefersDark.value ? "dark" : "light";
    }
    return theme.value;
  });

  const isDark = computed(() => effectiveTheme.value === "dark");

  function applyTheme(dark: boolean): void {
    if (typeof document === "undefined") return;
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function setTheme(newTheme: ThemePreference): void {
    theme.value = newTheme;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
    applyTheme(isDark.value);
  }

  onMounted(() => {
    applyTheme(isDark.value);
  });

  return {
    theme,
    effectiveTheme,
    isDark,
    setTheme,
  };
});
