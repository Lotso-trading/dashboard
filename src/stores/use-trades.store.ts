import type {
    ExecutedTrade,
    SortOrder,
    TradeModeFilter,
    TradeSide,
    TradeSortField,
    TradeStatus,
} from "@lotso-trading/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";
import { DEFAULT_PAGE_SIZE } from "../composables/use-pagination.ts";

export type TradeStatusFilter = "ALL" | TradeStatus;
export type TradeSideFilter = "ALL" | TradeSide;

export const useTradesStore = defineStore("trades", () => {
    const trades = ref<ExecutedTrade[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalPages = ref(1);
    const isLoading = ref(false);

    // Filtres & Tri
    const filterStatus = ref<TradeStatusFilter>("ALL");
    const filterSide = ref<TradeSideFilter>("ALL");
    const filterTargetAddress = ref<string>("ALL");
    const filterMode = ref<TradeModeFilter>("ALL");
    const searchQuery = ref<string>("");
    const sortBy = ref<TradeSortField>("executedAt");
    const sortOrder = ref<SortOrder>("desc");

    async function loadPage(targetPage = page.value): Promise<void> {
        isLoading.value = true;
        page.value = Math.max(1, targetPage);

        try {
            const res = await api.getTrades({
                page: page.value,
                limit: pageSize.value,
                status: filterStatus.value === "ALL" ? undefined : filterStatus.value,
                side: filterSide.value === "ALL" ? undefined : filterSide.value,
                targetAddress:
                    filterTargetAddress.value === "ALL" ? undefined : filterTargetAddress.value,
                isDryRun: filterMode.value === "ALL" ? undefined : filterMode.value,
                search: searchQuery.value.trim() || undefined,
                sortBy: sortBy.value,
                sortOrder: sortOrder.value,
            });
            trades.value = res.items;
            total.value = res.total;
            page.value = res.page;
            totalPages.value = Math.max(1, res.totalPages || Math.ceil(res.total / pageSize.value));
        } catch (err: unknown) {
            console.warn("[TradesStore] Erreur chargement trades:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchTrades(
        targetPage = 1,
        limit = pageSize.value,
        status?: TradeStatusFilter
    ): Promise<void> {
        pageSize.value = Math.min(100, Math.max(1, Math.floor(limit)));
        if (status !== undefined) {
            filterStatus.value = status;
        }
        await loadPage(targetPage);
    }

    async function setPage(nextPage: number): Promise<void> {
        await loadPage(nextPage);
    }

    async function setPageSize(nextSize: number): Promise<void> {
        pageSize.value = Math.min(100, Math.max(1, Math.floor(nextSize)));
        await loadPage(1);
    }

    async function setStatusFilter(status: TradeStatusFilter): Promise<void> {
        filterStatus.value = status;
        await loadPage(1);
    }

    async function setSideFilter(side: TradeSideFilter): Promise<void> {
        filterSide.value = side;
        await loadPage(1);
    }

    async function setTargetFilter(address: string): Promise<void> {
        filterTargetAddress.value = address;
        await loadPage(1);
    }

    async function setModeFilter(mode: TradeModeFilter): Promise<void> {
        filterMode.value = mode;
        await loadPage(1);
    }

    async function setSearch(query: string): Promise<void> {
        searchQuery.value = query;
        await loadPage(1);
    }

    async function toggleSort(field: TradeSortField): Promise<void> {
        if (sortBy.value === field) {
            sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
        } else {
            sortBy.value = field;
            sortOrder.value = "desc";
        }
        await loadPage(1);
    }

    async function resetFilters(): Promise<void> {
        filterStatus.value = "ALL";
        filterSide.value = "ALL";
        filterTargetAddress.value = "ALL";
        filterMode.value = "ALL";
        searchQuery.value = "";
        sortBy.value = "executedAt";
        sortOrder.value = "desc";
        await loadPage(1);
    }

    function handleTradeCreated(newTrade: ExecutedTrade): void {
        if (filterStatus.value !== "ALL" && filterStatus.value !== newTrade.status) return;
        if (filterSide.value !== "ALL" && filterSide.value !== newTrade.side) return;
        if (
            filterTargetAddress.value !== "ALL" &&
            filterTargetAddress.value.toLowerCase() !== newTrade.targetAddress.toLowerCase()
        ) {
            return;
        }
        if (filterMode.value === "DRY_RUN" && !newTrade.isDryRun) return;
        if (filterMode.value === "LIVE" && newTrade.isDryRun) return;

        if (page.value === 1 && sortBy.value === "executedAt" && sortOrder.value === "desc") {
            const exists = trades.value.some((t) => t.id === newTrade.id);
            if (!exists) {
                trades.value.unshift(newTrade);
                if (trades.value.length > pageSize.value) {
                    trades.value.pop();
                }
                total.value += 1;
                totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
            }
        } else {
            total.value += 1;
            totalPages.value = Math.max(1, Math.ceil(total.value / pageSize.value));
        }
    }

    return {
        trades,
        total,
        page,
        pageSize,
        totalPages,
        isLoading,
        filterStatus,
        filterSide,
        filterTargetAddress,
        filterMode,
        searchQuery,
        sortBy,
        sortOrder,
        loadPage,
        fetchTrades,
        setPage,
        setPageSize,
        setStatusFilter,
        setSideFilter,
        setTargetFilter,
        setModeFilter,
        setSearch,
        toggleSort,
        resetFilters,
        handleTradeCreated,
    };
});
