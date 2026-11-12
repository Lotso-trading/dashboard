import type { OpenPosition } from "@polymarket-copy/shared";

export interface ClosedPositionsTotals {
  count: number;
  totalInvested: number;
  totalPayout: number;
  totalGains: number;
  totalLosses: number;
  netPnl: number;
  totalShares: number;
  avgEntryPrice: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  roiPercent: number;
}

/**
 * Normalise un timestamp Unix en millisecondes.
 * Si la valeur est en secondes (< 1e11), elle est multipliée par 1000.
 */
export function toMs(timestamp?: number): number {
  if (!timestamp || Number.isNaN(timestamp)) return 0;
  return timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp;
}

/**
 * Filtre les positions clôturées au cours des dernières 24 heures.
 */
export function filterPositionsLast24h(
  positions: OpenPosition[],
  referenceTimeMs: number = Date.now()
): OpenPosition[] {
  const windowStartMs = referenceTimeMs - 24 * 60 * 60 * 1000;
  return positions.filter((p: OpenPosition): boolean => {
    const time = toMs(p.closedAt) || toMs(p.updatedAt);
    return time >= windowStartMs && time <= referenceTimeMs;
  });
}

/**
 * Calcule les agrégats financiers et statistiques d'un ensemble de positions clôturées.
 */
export function calculatePositionsSummary(positions: OpenPosition[]): ClosedPositionsTotals {
  const count = positions.length;
  const totalInvested = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.totalInvestedUsdc || 0),
    0
  );
  const totalPayout = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.settledPayoutUsdc || 0),
    0
  );
  const totalGains = positions
    .filter((p: OpenPosition): boolean => (p.realizedPnlUsdc ?? 0) > 0)
    .reduce((acc: number, p: OpenPosition): number => acc + (p.realizedPnlUsdc ?? 0), 0);
  const totalLosses = positions
    .filter((p: OpenPosition): boolean => (p.realizedPnlUsdc ?? 0) < 0)
    .reduce((acc: number, p: OpenPosition): number => acc + Math.abs(p.realizedPnlUsdc ?? 0), 0);
  const netPnl = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.realizedPnlUsdc ?? 0),
    0
  );
  const totalShares = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.totalShares || 0),
    0
  );
  const avgEntryPrice = totalShares > 0 ? totalInvested / totalShares : 0;
  const winCount = positions.filter(
    (p: OpenPosition): boolean => p.closeReason === "RESOLVED_WIN"
  ).length;
  const lossCount = positions.filter(
    (p: OpenPosition): boolean => p.closeReason === "RESOLVED_LOSS"
  ).length;
  const winRate = count > 0 ? (winCount / count) * 100 : 0;
  const roiPercent = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;

  return {
    count,
    totalInvested,
    totalPayout,
    totalGains,
    totalLosses,
    netPnl,
    totalShares,
    avgEntryPrice,
    winCount,
    lossCount,
    winRate,
    roiPercent,
  };
}
