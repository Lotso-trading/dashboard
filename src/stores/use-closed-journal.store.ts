import type { ClosedPositionsTotals, OpenPosition } from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import { DEFAULT_PAGE_SIZE } from "../composables/use-pagination.ts";
import { isClosedPositionWin } from "../utils/closed-outcome.ts";
import { createEmptyClosedTotals } from "./use-last-24h-summary.store.ts";

export const useClosedJournalStore = defineStore("closedJournal", () => {
    const items = ref<OpenPosition[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalPages = ref(1);
    const isLoading = ref(false);
    const filterStatus = ref<"ALL" | "WIN" | "LOSS">("ALL");
    const totals = ref<ClosedPositionsTotals>(createEmptyClosedTotals());
    const unfilteredTotals = ref<ClosedPositionsTotals>(createEmptyClosedTotals());
    const unfilteredCount = ref(0);

    async function loadPage(
        targetPage = page.value,
        status?: "ALL" | "WIN" | "LOSS"
    ): Promise<void> {
        if (status !== undefined) {
            filterStatus.value = status;
        }
        isLoading.value = true;
        page.value = Math.max(1, targetPage);

        try {
            const res = await api.getClosedPositionsPaginated({
                page: page.value,
                limit: pageSize.value,
                status: filterStatus.value,
            });

            items.value = res.items;
            total.value = res.total;
            page.value = res.page;
            totalPages.value = Math.max(1, res.totalPages);
            totals.value = res.totals || createEmptyClosedTotals();
            if (filterStatus.value === "ALL") {
                unfilteredCount.value = res.total;
                unfilteredTotals.value = totals.value;
            }
        } catch (err: unknown) {
            console.warn("[ClosedJournalStore] Erreur chargement journal clôturé:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function loadInitial(status: "ALL" | "WIN" | "LOSS" = "ALL"): Promise<void> {
        await loadPage(1, status);
    }

    async function setPage(nextPage: number): Promise<void> {
        await loadPage(nextPage);
    }

    async function setPageSize(nextSize: number): Promise<void> {
        pageSize.value = Math.min(100, Math.max(1, Math.floor(nextSize)));
        await loadPage(1);
    }

    async function setFilterStatus(status: "ALL" | "WIN" | "LOSS"): Promise<void> {
        await loadPage(1, status);
    }

    function handlePositionClosed(closedPos: OpenPosition): void {
        const isWin = isClosedPositionWin(closedPos);
        const matchesFilter =
            filterStatus.value === "ALL" ||
            (filterStatus.value === "WIN" && isWin) ||
            (filterStatus.value === "LOSS" && !isWin);

        if (!matchesFilter) return;

        if (page.value !== 1) {
            total.value += 1;
            totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
            return;
        }

        const existingIdx = items.value.findIndex((p) => p.id === closedPos.id);
        if (existingIdx !== -1) {
            items.value[existingIdx] = closedPos;
        } else {
            items.value.unshift(closedPos);
            if (items.value.length > pageSize.value) {
                items.value.pop();
            }
            total.value += 1;
            totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
        }
    }

    return {
        items,
        total,
        unfilteredCount,
        unfilteredTotals,
        page,
        pageSize,
        totalPages,
        isLoading,
        filterStatus,
        totals,
        loadPage,
        loadInitial,
        setPage,
        setPageSize,
        setFilterStatus,
        handlePositionClosed,
    };
});
