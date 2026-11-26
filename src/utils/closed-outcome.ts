import type { OpenPosition } from "@lotso-trading/shared";

export interface ClosedPositionOutcomeDisplay {
    readonly isWin: boolean;
    readonly isCancelled?: boolean;
    readonly label: string;
    readonly variant: "success" | "danger" | "neutral";
    readonly icon: "trophy" | "x-circle" | "trending-up" | "trending-down" | "ban";
}

/**
 * Règle canonique partagée avec l'API : une clôture est gagnante si `RESOLVED_WIN`
 * ou si son PnL réalisé (`realizedPnlUsdc`) est strictement positif (`WHALE_SELL` / `MANUAL`).
 * Les marchés annulés (`RESOLVED_CANCELLED` / 50-50) sont neutres (ni victoire ni défaite).
 */
export function isClosedPositionWin(
    pos: Pick<OpenPosition, "closeReason" | "realizedPnlUsdc">
): boolean {
    if (pos.closeReason === "RESOLVED_CANCELLED") return false;
    if (pos.closeReason === "RESOLVED_WIN") return true;
    return Number(pos.realizedPnlUsdc ?? 0) > 0;
}

export function getClosedPositionOutcome(
    pos: Pick<OpenPosition, "closeReason" | "realizedPnlUsdc">
): ClosedPositionOutcomeDisplay {
    if (pos.closeReason === "RESOLVED_CANCELLED") {
        return {
            isWin: false,
            isCancelled: true,
            label: "Annulé (50/50)",
            variant: "neutral",
            icon: "ban",
        };
    }

    const isWin = isClosedPositionWin(pos);

    if (pos.closeReason === "RESOLVED_WIN") {
        return { isWin: true, label: "Victoire", variant: "success", icon: "trophy" };
    }
    if (pos.closeReason === "RESOLVED_LOSS") {
        return { isWin: false, label: "Défaite", variant: "danger", icon: "x-circle" };
    }
    if (pos.closeReason === "WHALE_SELL") {
        return isWin
            ? { isWin: true, label: "Vente +", variant: "success", icon: "trending-up" }
            : { isWin: false, label: "Vente -", variant: "danger", icon: "trending-down" };
    }
    if (pos.closeReason === "MANUAL") {
        return isWin
            ? { isWin: true, label: "Manuel +", variant: "success", icon: "trending-up" }
            : { isWin: false, label: "Manuel -", variant: "danger", icon: "trending-down" };
    }

    return isWin
        ? { isWin: true, label: "Victoire", variant: "success", icon: "trophy" }
        : { isWin: false, label: "Défaite", variant: "danger", icon: "x-circle" };
}
