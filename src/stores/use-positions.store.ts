import type { OpenPosition, SyncRequestResponse } from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "../api/http-client.ts";
import { isClosedPositionWin } from "../utils/closed-outcome.ts";

export const usePositionsStore = defineStore("positions", () => {
    const positions = ref<OpenPosition[]>([]);
    const closedPositions = ref<OpenPosition[]>([]);
    const isLoading = ref(false);
    const isSettling = ref(false);
    const lastRefreshedAt = ref<number | null>(null);
    const lastSyncFeedback = ref<string | null>(null);

    const totalUnrealizedPnlUsdc = computed(() => {
        return positions.value.reduce((acc, pos) => acc + (pos.unrealizedPnlUsdc || 0), 0);
    });

    const totalPositionsValueUsdc = computed(() => {
        return positions.value.reduce((acc, pos) => acc + (pos.currentMarketValueUsdc || 0), 0);
    });

    const totalInvestedUsdc = computed(() => {
        return positions.value.reduce((acc, pos) => acc + (pos.totalInvestedUsdc || 0), 0);
    });

    const totalPayoutPotentialUsdc = computed(() => {
        return positions.value.reduce((acc, pos) => acc + (pos.totalShares || 0), 0);
    });

    const totalRealizedPnlUsdc = computed(() => {
        return closedPositions.value.reduce((acc, pos) => acc + (pos.realizedPnlUsdc || 0), 0);
    });

    const totalSettledPayoutUsdc = computed(() => {
        return closedPositions.value.reduce((acc, pos) => acc + (pos.settledPayoutUsdc || 0), 0);
    });

    const totalInvestedClosedUsdc = computed(() => {
        return closedPositions.value.reduce((acc, pos) => acc + (pos.totalInvestedUsdc || 0), 0);
    });

    const winsCount = computed(() => {
        return closedPositions.value.filter((p) => isClosedPositionWin(p)).length;
    });

    const lossesCount = computed(() => {
        return closedPositions.value.filter((p) => !isClosedPositionWin(p)).length;
    });

    const winRatePercent = computed(() => {
        if (closedPositions.value.length === 0) return 0;
        return (winsCount.value / closedPositions.value.length) * 100;
    });

    const roiClosedPercent = computed(() => {
        if (totalInvestedClosedUsdc.value === 0) return 0;
        return (
            ((totalSettledPayoutUsdc.value - totalInvestedClosedUsdc.value) /
                totalInvestedClosedUsdc.value) *
            100
        );
    });

    const openPositionsSortedByExpiry = computed(() => {
        return [...positions.value].sort((a, b) => {
            const timeA = a.endDate ? new Date(a.endDate).getTime() : Number.POSITIVE_INFINITY;
            const timeB = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY;
            const safeA = Number.isNaN(timeA) ? Number.POSITIVE_INFINITY : timeA;
            const safeB = Number.isNaN(timeB) ? Number.POSITIVE_INFINITY : timeB;
            if (safeA !== safeB) return safeA - safeB;
            return (b.totalInvestedUsdc || 0) - (a.totalInvestedUsdc || 0);
        });
    });

    async function fetchPositions(): Promise<void> {
        isLoading.value = true;
        try {
            positions.value = await api.getPositions();
            lastRefreshedAt.value = Date.now();
        } catch (err: unknown) {
            console.warn("[PositionsStore] Erreur chargement positions ouvertes:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchClosedPositions(): Promise<void> {
        try {
            closedPositions.value = await api.getClosedPositions();
        } catch (err: unknown) {
            console.warn("[PositionsStore] Erreur chargement positions fermées:", err);
        }
    }

    async function requestBotSyncAndRefresh(): Promise<SyncRequestResponse> {
        if (isSettling.value) {
            return {
                requested: false,
                botOnline: false,
                message: "Actualisation déjà en cours.",
                requestedAt: Date.now(),
            };
        }

        isSettling.value = true;
        try {
            const res = await api.requestPositionSync();
            lastSyncFeedback.value = res.message;
            await Promise.all([fetchPositions(), fetchClosedPositions()]);
            lastRefreshedAt.value = Date.now();
            return res;
        } catch (err: unknown) {
            console.warn("[PositionsStore] Erreur lors de la demande de synchronisation:", err);
            const fallback: SyncRequestResponse = {
                requested: false,
                botOnline: false,
                message: "Impossible de contacter l'API pour actualiser.",
                requestedAt: Date.now(),
            };
            lastSyncFeedback.value = fallback.message;
            return fallback;
        } finally {
            isSettling.value = false;
        }
    }

    function handlePositionUpdated(updated: OpenPosition): void {
        if (updated.status === "CLOSED" || updated.totalShares <= 0) {
            handlePositionClosed(updated.conditionId, updated);
            return;
        }

        const index = positions.value.findIndex((p) => p.conditionId === updated.conditionId);
        if (index !== -1) {
            positions.value[index] = updated;
        } else {
            positions.value.unshift(updated);
        }
        lastRefreshedAt.value = Date.now();
    }

    function handlePositionClosed(conditionId: string, closedPos?: OpenPosition): void {
        positions.value = positions.value.filter((p) => p.conditionId !== conditionId);
        if (closedPos) {
            const existingIdx = closedPositions.value.findIndex(
                (p) => p.conditionId === conditionId
            );
            if (existingIdx !== -1) {
                closedPositions.value[existingIdx] = closedPos;
            } else {
                closedPositions.value.unshift(closedPos);
            }
        } else {
            fetchClosedPositions();
        }
        lastRefreshedAt.value = Date.now();
    }

    return {
        positions,
        closedPositions,
        isLoading,
        isSettling,
        lastRefreshedAt,
        lastSyncFeedback,
        totalUnrealizedPnlUsdc,
        totalPositionsValueUsdc,
        totalInvestedUsdc,
        totalPayoutPotentialUsdc,
        totalRealizedPnlUsdc,
        totalSettledPayoutUsdc,
        totalInvestedClosedUsdc,
        winsCount,
        lossesCount,
        winRatePercent,
        roiClosedPercent,
        openPositionsSortedByExpiry,
        fetchPositions,
        fetchClosedPositions,
        requestBotSyncAndRefresh,
        handlePositionUpdated,
        handlePositionClosed,
    };
});
