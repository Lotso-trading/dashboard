import type { ServiceVersions } from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";

declare const __DASHBOARD_VERSION__: string | undefined;

export function getDashboardVersion(): string {
    return typeof __DASHBOARD_VERSION__ === "string" && __DASHBOARD_VERSION__.length > 0
        ? __DASHBOARD_VERSION__
        : "1.0.0";
}

export const useSystemStore = defineStore("system", () => {
    const dashboardVersion = ref<string>(getDashboardVersion());
    const versions = ref<ServiceVersions>({
        api: "—",
        bot: null,
        shared: "—",
        botOnline: false,
        updatedAt: Date.now(),
    });
    const isLoading = ref(false);

    async function fetchVersions(): Promise<void> {
        isLoading.value = true;
        try {
            versions.value = await api.getSystemVersions();
        } catch (err: unknown) {
            console.warn("[SystemStore] Erreur chargement versions des services:", err);
        } finally {
            isLoading.value = false;
        }
    }

    function handleVersionsUpdated(updated: ServiceVersions): void {
        versions.value = updated;
    }

    return {
        dashboardVersion,
        versions,
        isLoading,
        fetchVersions,
        handleVersionsUpdated,
    };
});
