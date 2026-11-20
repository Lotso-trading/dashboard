import type {
    ClosedPositionsTotals,
    PeriodGranularity,
    PeriodSortField,
    PeriodSummaryItem,
    SortOrder,
} from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import { DEFAULT_PAGE_SIZE } from "../composables/use-pagination.ts";
import { createEmptyClosedTotals } from "./use-last-24h-summary.store.ts";

function resolveBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

export const usePeriodSummaryStore = defineStore("periodSummary", () => {
    const granularity = ref<PeriodGranularity>("day");
    const items = ref<PeriodSummaryItem[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalPages = ref(1);
    const sortBy = ref<PeriodSortField>("period");
    const sortOrder = ref<SortOrder>("desc");
    const totals = ref<ClosedPositionsTotals>(createEmptyClosedTotals());
    const bestPeriod = ref<PeriodSummaryItem | null>(null);
    const worstPeriod = ref<PeriodSummaryItem | null>(null);
    const avgNetPnlPerPeriod = ref(0);
    const isLoading = ref(false);

    async function loadPage(targetPage = page.value): Promise<void> {
        isLoading.value = true;
        page.value = Math.max(1, targetPage);

        try {
            const res = await api.getPeriodSummary({
                granularity: granularity.value,
                page: page.value,
                limit: pageSize.value,
                sortBy: sortBy.value,
                sortOrder: sortOrder.value,
                tz: resolveBrowserTimezone(),
            });

            items.value = res.items;
            total.value = res.total;
            page.value = res.page;
            totalPages.value = Math.max(1, res.totalPages);
            totals.value = res.totals || createEmptyClosedTotals();
            bestPeriod.value = res.bestPeriod ?? null;
            worstPeriod.value = res.worstPeriod ?? null;
            avgNetPnlPerPeriod.value = res.avgNetPnlPerPeriod ?? 0;
        } catch (err: unknown) {
            console.warn("[PeriodSummaryStore] Erreur chargement bilan périodique:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function setGranularity(next: PeriodGranularity): Promise<void> {
        if (granularity.value === next) return;
        granularity.value = next;
        await loadPage(1);
    }

    async function setPage(nextPage: number): Promise<void> {
        await loadPage(nextPage);
    }

    async function setPageSize(nextSize: number): Promise<void> {
        pageSize.value = Math.min(100, Math.max(1, Math.floor(nextSize)));
        await loadPage(1);
    }

    async function toggleSort(field: PeriodSortField): Promise<void> {
        if (sortBy.value === field) {
            sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
        } else {
            sortBy.value = field;
            sortOrder.value = "desc";
        }
        await loadPage(1);
    }

    return {
        granularity,
        items,
        total,
        page,
        pageSize,
        totalPages,
        sortBy,
        sortOrder,
        totals,
        bestPeriod,
        worstPeriod,
        avgNetPnlPerPeriod,
        isLoading,
        loadPage,
        setGranularity,
        setPage,
        setPageSize,
        toggleSort,
    };
});
