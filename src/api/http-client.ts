import type {
    AddTargetInput,
    ApiResponse,
    ClosedPositionsTotals,
    ExecutedTrade,
    OpenPosition,
    PeriodSummaryQueryParsed,
    PeriodSummaryResponse,
    RiskConfig,
    ServiceVersions,
    SyncRequestResponse,
    TargetTrader,
    TradesQuery,
    UpdateRiskConfigInput,
    UpdateTargetInput,
} from "@lotso-trading/shared";

export interface ClosedPositionsRequestParams {
    page?: number;
    limit?: number;
    status?: "ALL" | "WIN" | "LOSS" | "CANCELLED";
    since?: number;
}

export interface GlobalMetrics {
    totalTradedVolumeUsdc: number;
    totalCopiedTrades: number;
    totalRejectedTrades: number;
    activePositionsCount: number;
    closedPositionsCount?: number;
    initialCapitalUsdc?: number;
    totalInvestedUsdc: number;
    currentPositionsValueUsdc: number;
    unrealizedPnlUsdc: number;
    realizedPnlUsdc?: number;
    peakRealizedPnlUsdc?: number;
    totalSettledPayoutUsdc?: number;
    availableCashUsdc?: number;
    totalPortfolioValueUsdc?: number;
    activeTargetsCount: number;
}

export interface PerformancePoint {
    timestamp: number;
    tradeId?: string;
    side?: "BUY" | "SELL";
    shares?: number;
    price?: number;
    costUsdc?: number;
    targetAddress?: string;
    targetAlias?: string;
    myCumulativePnlUsdc: number;
    portfolioValueUsdc: number;
    whaleCumulativeUsdc: number;
}

class HttpClient {
    private baseUrl = "/api";

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        };

        const res = await fetch(url, { ...options, headers });
        const json = (await res.json()) as ApiResponse<T>;

        if (!json.success) {
            throw new Error(json.error.message || "Erreur réseau inconnue");
        }

        return json.data;
    }

    // --- Système & Versions ---
    async getSystemVersions(): Promise<ServiceVersions> {
        return await this.request<ServiceVersions>("/system/versions");
    }

    // --- Cibles (Targets / Baleines) ---
    async getTargets(): Promise<TargetTrader[]> {
        return await this.request<TargetTrader[]>("/targets");
    }

    async createTarget(dto: AddTargetInput): Promise<TargetTrader> {
        return await this.request<TargetTrader>("/targets", {
            method: "POST",
            body: JSON.stringify(dto),
        });
    }

    async updateTarget(id: string, dto: UpdateTargetInput): Promise<TargetTrader> {
        return await this.request<TargetTrader>(`/targets/${id}`, {
            method: "PATCH",
            body: JSON.stringify(dto),
        });
    }

    async deleteTarget(id: string): Promise<boolean> {
        const res = await this.request<{ deleted: boolean }>(`/targets/${id}`, {
            method: "DELETE",
        });
        return res.deleted;
    }

    // --- Positions Ouvertes & Clôturées ---
    async getPositions(): Promise<OpenPosition[]> {
        return await this.request<OpenPosition[]>("/positions");
    }

    async getClosedPositions(): Promise<OpenPosition[]> {
        return await this.request<OpenPosition[]>("/positions/closed");
    }

    async getClosedSummary(since?: number): Promise<ClosedPositionsTotals> {
        const query = since && since > 0 ? `?since=${encodeURIComponent(String(since))}` : "";
        return await this.request<ClosedPositionsTotals>(`/positions/closed-summary${query}`);
    }

    async getClosedPositionsPaginated(params: ClosedPositionsRequestParams = {}): Promise<{
        items: OpenPosition[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        totals: ClosedPositionsTotals;
    }> {
        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.status && params.status !== "ALL") query.set("status", params.status);
        if (params.since) query.set("since", String(params.since));

        const queryString = query.toString() ? `?${query.toString()}` : "";
        return await this.request<{
            items: OpenPosition[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            totals: ClosedPositionsTotals;
        }>(`/positions/closed${queryString}`);
    }

    async requestPositionSync(): Promise<SyncRequestResponse> {
        return await this.request<SyncRequestResponse>("/positions/sync-request", {
            method: "POST",
        });
    }

    // --- Historique des Trades ---
    async getTrades(params: Partial<TradesQuery> = {}): Promise<{
        items: ExecutedTrade[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.status) query.set("status", params.status);
        if (params.side) query.set("side", params.side);
        if (params.targetAddress) query.set("targetAddress", params.targetAddress);
        if (params.isDryRun && params.isDryRun !== "ALL") query.set("isDryRun", params.isDryRun);
        const trimmedSearch = params.search?.trim();
        if (trimmedSearch) query.set("search", trimmedSearch);
        if (params.sortBy) query.set("sortBy", params.sortBy);
        if (params.sortOrder) query.set("sortOrder", params.sortOrder);

        const queryString = query.toString() ? `?${query.toString()}` : "";
        return await this.request<{
            items: ExecutedTrade[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>(`/trades${queryString}`);
    }

    // --- Configuration du Risque ---
    async getConfig(): Promise<RiskConfig> {
        return await this.request<RiskConfig>("/config");
    }

    async updateConfig(dto: UpdateRiskConfigInput): Promise<RiskConfig> {
        return await this.request<RiskConfig>("/config", {
            method: "PUT",
            body: JSON.stringify(dto),
        });
    }

    // --- Gestion du Portefeuille Virtuel (Dry Run) ---
    async depositVirtualWallet(
        amountUsdc: number
    ): Promise<{ success: boolean; simulatedBalanceUsdc: number; availableCashUsdc: number }> {
        return await this.request<{
            success: boolean;
            simulatedBalanceUsdc: number;
            availableCashUsdc: number;
        }>("/config/wallet/deposit", {
            method: "POST",
            body: JSON.stringify({ amountUsdc }),
        });
    }

    async withdrawVirtualWallet(
        amountUsdc: number
    ): Promise<{ success: boolean; simulatedBalanceUsdc: number; availableCashUsdc: number }> {
        return await this.request<{
            success: boolean;
            simulatedBalanceUsdc: number;
            availableCashUsdc: number;
        }>("/config/wallet/withdraw", {
            method: "POST",
            body: JSON.stringify({ amountUsdc }),
        });
    }

    // --- Métriques PnL Globales & Bilans Périodiques ---
    async getMetrics(): Promise<GlobalMetrics> {
        return await this.request<GlobalMetrics>("/metrics");
    }

    async getPerformanceHistory(): Promise<PerformancePoint[]> {
        return await this.request<PerformancePoint[]>("/metrics/performance-history");
    }

    async getPeriodSummary(
        params: Partial<PeriodSummaryQueryParsed> = {}
    ): Promise<PeriodSummaryResponse> {
        const query = new URLSearchParams();
        if (params.granularity) query.set("granularity", params.granularity);
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.sortBy) query.set("sortBy", params.sortBy);
        if (params.sortOrder) query.set("sortOrder", params.sortOrder);
        if (params.tz) query.set("tz", params.tz);

        const queryString = query.toString() ? `?${query.toString()}` : "";
        return await this.request<PeriodSummaryResponse>(`/metrics/period-summary${queryString}`);
    }

    // --- Reset Simulation ---
    async resetSimulation(): Promise<{ success: boolean; deletedTradesCount: number }> {
        return await this.request<{ success: boolean; deletedTradesCount: number }>(
            "/trades/reset-simulation",
            { method: "POST" }
        );
    }
}

export const api = new HttpClient();
