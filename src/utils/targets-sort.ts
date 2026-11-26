import type { OpenPosition, SortOrder, TargetTrader } from "@lotso-trading/shared";

export type TargetSortField = "wl" | "winRate" | "realizedPnl" | "trades";

export interface TargetPerformanceStats {
    readonly trades: number;
    readonly volume: number;
    readonly realizedPnl: number;
    readonly wins: number;
    readonly losses: number;
    readonly totalClosed: number;
    readonly winRate: number;
    readonly wlDiff: number;
}

export function computeTargetPerformance(
    target: TargetTrader,
    closedPositions: OpenPosition[]
): TargetPerformanceStats {
    const addr = target.address.toLowerCase();

    const closedForTarget = closedPositions.filter((p) => p.targetAddress?.toLowerCase() === addr);

    const localWins = closedForTarget.filter(
        (p) =>
            p.closeReason !== "RESOLVED_CANCELLED" &&
            (p.closeReason === "RESOLVED_WIN" || (p.realizedPnlUsdc ?? 0) > 0)
    ).length;

    const localLosses = closedForTarget.filter(
        (p) =>
            p.closeReason !== "RESOLVED_CANCELLED" &&
            (p.closeReason === "RESOLVED_LOSS" || (p.realizedPnlUsdc ?? 0) < 0)
    ).length;

    const localPnl = closedForTarget.reduce((acc, p) => acc + (p.realizedPnlUsdc ?? 0), 0);

    const wins =
        target.stats.wonTrades !== undefined && target.stats.wonTrades > 0
            ? target.stats.wonTrades
            : localWins;

    const losses =
        target.stats.lostTrades !== undefined && target.stats.lostTrades > 0
            ? target.stats.lostTrades
            : localLosses;

    const totalClosed = wins + losses;
    const realizedPnl =
        Math.abs(target.stats.realizedPnlUsdc) > 0.001 ? target.stats.realizedPnlUsdc : localPnl;
    const winRate =
        totalClosed > 0 ? (wins / totalClosed) * 100 : (target.stats.winRatePercent ?? 0);

    return {
        trades: target.stats.totalCopiedTrades,
        volume: target.stats.totalCopiedVolumeUsdc,
        realizedPnl,
        wins,
        losses,
        totalClosed,
        winRate,
        wlDiff: wins - losses,
    };
}

export function sortTargets(
    targets: TargetTrader[],
    perfMap: Map<string, TargetPerformanceStats>,
    sortBy: TargetSortField,
    sortOrder: SortOrder
): TargetTrader[] {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...targets].sort((a, b) => {
        const pa = perfMap.get(a.id);
        const pb = perfMap.get(b.id);
        let cmp = 0;

        switch (sortBy) {
            case "wl": {
                const diffA = pa?.wlDiff ?? 0;
                const diffB = pb?.wlDiff ?? 0;
                cmp = diffA - diffB;
                if (cmp === 0) {
                    cmp = (pa?.wins ?? 0) - (pb?.wins ?? 0);
                }
                break;
            }
            case "winRate":
                cmp = (pa?.winRate ?? 0) - (pb?.winRate ?? 0);
                break;
            case "realizedPnl":
                cmp = (pa?.realizedPnl ?? 0) - (pb?.realizedPnl ?? 0);
                break;
            case "trades":
                cmp = (pa?.trades ?? 0) - (pb?.trades ?? 0);
                break;
        }

        if (cmp !== 0) return cmp * dir;
        return a.alias.localeCompare(b.alias);
    });
}
