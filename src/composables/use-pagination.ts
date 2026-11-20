import { computed, type Ref, ref, watch } from "vue";

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function usePagination<T>(items: Ref<readonly T[]>, initialPageSize = DEFAULT_PAGE_SIZE) {
    const page = ref(1);
    const pageSize = ref(initialPageSize);

    const totalItems = computed(() => items.value.length);
    const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)));

    watch([totalPages], ([maxPages]) => {
        if (page.value > maxPages) {
            page.value = maxPages;
        }
    });

    const paginatedItems = computed(() => {
        const start = (page.value - 1) * pageSize.value;
        return items.value.slice(start, start + pageSize.value);
    });

    function setPage(nextPage: number): void {
        const clamped = Math.min(totalPages.value, Math.max(1, Math.floor(nextPage)));
        page.value = clamped;
    }

    function setPageSize(nextSize: number): void {
        const safe = Math.min(100, Math.max(1, Math.floor(nextSize)));
        pageSize.value = safe;
        page.value = 1;
    }

    function resetPage(): void {
        page.value = 1;
    }

    return {
        page,
        pageSize,
        totalItems,
        totalPages,
        paginatedItems,
        setPage,
        setPageSize,
        resetPage,
    };
}
