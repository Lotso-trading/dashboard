import type { PerformancePoint } from "../api/http-client.ts";

export type TimeFilterPeriod = "1H" | "24H" | "3J" | "1M" | "ALL";

export const PERIOD_DURATIONS_MS: Record<Exclude<TimeFilterPeriod, "ALL">, number> = {
    "1H": 60 * 60 * 1000,
    "24H": 24 * 60 * 60 * 1000,
    "3J": 3 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
};

export interface FilterPerformanceResult {
    points: PerformancePoint[];
    timeRange: { min: number; max: number };
}

/**
 * Filtre et interpole les points de performance selon la période et la baleine sélectionnées.
 */
export function filterPerformancePoints(
    rawPoints: PerformancePoint[],
    period: TimeFilterPeriod,
    selectedWhaleAddress: string,
    initialCapital: number,
    referenceTimeMs: number = Date.now()
): FilterPerformanceResult {
    // 1. Filtrer d'abord par baleine
    const whaleFiltered =
        selectedWhaleAddress === "ALL"
            ? rawPoints
            : rawPoints.filter(
                  (p) =>
                      !p.targetAddress ||
                      p.targetAddress.toLowerCase() === selectedWhaleAddress.toLowerCase()
              );

    // 2. Si aucun point disponible, générer un repère par défaut
    if (whaleFiltered.length === 0) {
        const duration = period === "ALL" ? 3600000 : PERIOD_DURATIONS_MS[period];
        const min = referenceTimeMs - duration;
        const max = referenceTimeMs;
        return {
            points: [
                {
                    timestamp: min,
                    myCumulativePnlUsdc: 0,
                    portfolioValueUsdc: initialCapital,
                    whaleCumulativeUsdc: 0,
                },
                {
                    timestamp: max,
                    myCumulativePnlUsdc: 0,
                    portfolioValueUsdc: initialCapital,
                    whaleCumulativeUsdc: 0,
                },
            ],
            timeRange: { min, max },
        };
    }

    const sorted = [...whaleFiltered].sort((a, b) => a.timestamp - b.timestamp);

    // 3. Cas ALL : tout l'historique étendu jusqu'à l'instant présent
    if (period === "ALL") {
        const firstPoint = sorted[0];
        const min = firstPoint ? firstPoint.timestamp : referenceTimeMs - 3600000;
        const lastPoint = sorted[sorted.length - 1];
        const max = Math.max(referenceTimeMs, lastPoint ? lastPoint.timestamp : referenceTimeMs);

        const points = [...sorted];
        if (lastPoint && lastPoint.timestamp < referenceTimeMs) {
            points.push({
                timestamp: referenceTimeMs,
                myCumulativePnlUsdc: lastPoint.myCumulativePnlUsdc,
                portfolioValueUsdc: lastPoint.portfolioValueUsdc,
                whaleCumulativeUsdc: lastPoint.whaleCumulativeUsdc,
            });
        }

        return {
            points,
            timeRange: { min, max: max === min ? min + 1 : max },
        };
    }

    // 4. Cas périodique (1H, 24H, 3J, 1M)
    const duration = PERIOD_DURATIONS_MS[period];
    const cutoff = referenceTimeMs - duration;
    const timeRange = { min: cutoff, max: referenceTimeMs };

    const pointsBefore = sorted.filter((p) => p.timestamp < cutoff);
    const pointsInWindow = sorted.filter(
        (p) => p.timestamp >= cutoff && p.timestamp <= referenceTimeMs
    );
    const lastBefore = pointsBefore[pointsBefore.length - 1];

    const points: PerformancePoint[] = [];

    // Report de l'état précédent à la frontière gauche (cutoff)
    if (lastBefore) {
        points.push({
            timestamp: cutoff,
            myCumulativePnlUsdc: lastBefore.myCumulativePnlUsdc,
            portfolioValueUsdc: lastBefore.portfolioValueUsdc,
            whaleCumulativeUsdc: lastBefore.whaleCumulativeUsdc,
        });
    } else {
        points.push({
            timestamp: cutoff,
            myCumulativePnlUsdc: 0,
            portfolioValueUsdc: initialCapital,
            whaleCumulativeUsdc: 0,
        });
    }

    // Ajout des points intrajournaliers
    for (const pt of pointsInWindow) {
        if (pt.timestamp === cutoff) {
            points[0] = pt;
        } else {
            points.push(pt);
        }
    }

    // Prolongement jusqu'à l'instant présent (frontière droite)
    const latest = points[points.length - 1];
    if (latest && latest.timestamp < referenceTimeMs) {
        points.push({
            timestamp: referenceTimeMs,
            myCumulativePnlUsdc: latest.myCumulativePnlUsdc,
            portfolioValueUsdc: latest.portfolioValueUsdc,
            whaleCumulativeUsdc: latest.whaleCumulativeUsdc,
        });
    }

    return {
        points,
        timeRange,
    };
}

/**
 * Formate les libellés de l'axe X selon la période sélectionnée et l'étendue de temps.
 */
export function formatXTickLabel(date: Date, period: TimeFilterPeriod, spanMs: number): string {
    if (period === "1H" || period === "24H") {
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }

    if (period === "3J") {
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    if (period === "1M") {
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
        });
    }

    // ALL : adaptatif
    if (spanMs <= 86_400_000) {
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    if (spanMs <= 7 * 86_400_000) {
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
    });
}

/**
 * Formate l'horodatage pour le tooltip interactif selon la période.
 */
export function formatTooltipDate(timestamp: number, period: TimeFilterPeriod): string {
    const d = new Date(timestamp);
    if (period === "1H" || period === "24H") {
        return d.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
