import { computed } from "vue";
import { useConfigStore } from "../stores/use-config.store.ts";
import { useLast24hSummaryStore } from "../stores/use-last-24h-summary.store.ts";
import { useMetricsStore } from "../stores/use-metrics.store.ts";
import { usePositionsStore } from "../stores/use-positions.store.ts";

export {
    type ClosedPositionOutcomeDisplay,
    getClosedPositionOutcome,
    isClosedPositionWin,
} from "../utils/closed-outcome.ts";

/**
 * Source de vérité unique côté Dashboard pour les métriques comptables du portefeuille.
 * N'écrase jamais le capital initial (`simulatedBalanceUsdc`) par le plafond d'allocation (`maxAllocatedCapitalUsdc`).
 */
export function usePortfolioMetrics() {
    const configStore = useConfigStore();
    const metricsStore = useMetricsStore();
    const positionsStore = usePositionsStore();
    const last24hStore = useLast24hSummaryStore();

    const initialCapitalUsdc = computed<number>(() => {
        if (
            typeof configStore.config?.simulatedBalanceUsdc === "number" &&
            configStore.config.simulatedBalanceUsdc > 0
        ) {
            return configStore.config.simulatedBalanceUsdc;
        }
        if (
            typeof metricsStore.metrics.initialCapitalUsdc === "number" &&
            metricsStore.metrics.initialCapitalUsdc > 0
        ) {
            return metricsStore.metrics.initialCapitalUsdc;
        }
        return 1000.0;
    });

    const realizedPnlUsdc = computed<number>(() => {
        if (typeof metricsStore.metrics.realizedPnlUsdc === "number") {
            return metricsStore.metrics.realizedPnlUsdc;
        }
        return last24hStore.totalsAll.netPnl;
    });

    const unrealizedPnlUsdc = computed<number>(() => {
        if (positionsStore.positions.length > 0) {
            return positionsStore.totalUnrealizedPnlUsdc;
        }
        return Number(metricsStore.metrics.unrealizedPnlUsdc ?? 0);
    });

    const totalSettledPayoutUsdc = computed<number>(() => {
        if (
            typeof metricsStore.metrics.totalSettledPayoutUsdc === "number" &&
            metricsStore.metrics.totalSettledPayoutUsdc > 0
        ) {
            return metricsStore.metrics.totalSettledPayoutUsdc;
        }
        return last24hStore.totalsAll.totalPayout;
    });

    const availableCashUsdc = computed<number>(() => {
        if (typeof metricsStore.metrics.availableCashUsdc === "number") {
            return metricsStore.metrics.availableCashUsdc;
        }
        return Math.max(
            0,
            initialCapitalUsdc.value - positionsStore.totalInvestedUsdc + realizedPnlUsdc.value
        );
    });

    const totalPortfolioValueUsdc = computed<number>(() => {
        return availableCashUsdc.value + positionsStore.totalPositionsValueUsdc;
    });

    const overallNetGainUsdc = computed<number>(() => {
        return totalPortfolioValueUsdc.value - initialCapitalUsdc.value;
    });

    const overallRoiPercent = computed<number>(() => {
        if (initialCapitalUsdc.value <= 0) return 0;
        return (overallNetGainUsdc.value / initialCapitalUsdc.value) * 100;
    });

    return {
        initialCapitalUsdc,
        realizedPnlUsdc,
        unrealizedPnlUsdc,
        totalSettledPayoutUsdc,
        availableCashUsdc,
        totalPortfolioValueUsdc,
        overallNetGainUsdc,
        overallRoiPercent,
    };
}
