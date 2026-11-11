import type {
  AddTargetInput,
  ApiResponse,
  ExecutedTrade,
  OpenPosition,
  RiskConfig,
  TargetTrader,
  UpdateRiskConfigInput,
  UpdateTargetInput,
} from "@polymarket-copy/shared";

export interface GlobalMetrics {
  totalTradedVolumeUsdc: number;
  totalCopiedTrades: number;
  totalRejectedTrades: number;
  activePositionsCount: number;
  initialCapitalUsdc?: number;
  totalInvestedUsdc: number;
  currentPositionsValueUsdc: number;
  unrealizedPnlUsdc: number;
  realizedPnlUsdc?: number;
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

  // --- Cibles (Targets / Baleines) ---
  async getTargets(): Promise<TargetTrader[]> {
    return await this.request<TargetTrader[]>("/targets");
  }

  async createTarget(dto: AddTargetInput): Promise<TargetTrader> {
    return (await this.request<TargetTrader[]>("/targets", {
      method: "POST",
      body: JSON.stringify(dto),
    })) as unknown as TargetTrader;
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

  async settlePositions(): Promise<{ settledCount: number; message: string }> {
    return await this.request<{ settledCount: number; message: string }>("/positions/settle", {
      method: "POST",
    });
  }

  // --- Historique des Trades ---
  async getTrades(params: { page?: number; limit?: number; status?: string } = {}): Promise<{
    items: ExecutedTrade[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.status) query.set("status", params.status);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return await this.request<{
      items: ExecutedTrade[];
      total: number;
      page: number;
      limit: number;
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

  // --- Métriques PnL Globales ---
  async getMetrics(): Promise<GlobalMetrics> {
    return await this.request<GlobalMetrics>("/metrics");
  }

  async getPerformanceHistory(): Promise<PerformancePoint[]> {
    return await this.request<PerformancePoint[]>("/metrics/performance-history");
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
