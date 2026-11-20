import { toMs } from "./positions-summary.ts";

export type ExpiryTone = "warning" | "danger" | "info" | "neutral";

export interface RelativeExpiryInfo {
    readonly label: string;
    readonly tone: ExpiryTone;
}

export function formatCurrency(value?: number, decimals = 2): string {
    const safe = Number.isFinite(value) ? Number(value) : 0;
    return `$${safe.toFixed(decimals)}`;
}

export function formatSignedCurrency(value?: number, decimals = 2): string {
    const safe = Number.isFinite(value) ? Number(value) : 0;
    const prefix = safe >= 0 ? "+" : "-";
    return `${prefix}$${Math.abs(safe).toFixed(decimals)}`;
}

export function formatSignedPercent(value?: number, decimals = 1): string {
    const safe = Number.isFinite(value) ? Number(value) : 0;
    const prefix = safe >= 0 ? "+" : "";
    return `${prefix}${safe.toFixed(decimals)}%`;
}

export function truncateAddress(address?: string, start = 6, end = 4): string {
    if (!address) return "—";
    if (address.length <= start + end + 3) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatTimestampDateTime(timestamp?: number): string {
    const ms = toMs(timestamp);
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatTimestampTime(timestamp?: number, includeSeconds = false): string {
    const ms = toMs(timestamp);
    if (!ms) return "—";
    return new Date(ms).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        ...(includeSeconds ? { second: "2-digit" } : {}),
    });
}

export function formatLocalIsoDate(isoDate?: string): string {
    if (!isoDate) return "Date en attente";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "Date en attente";
    return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatUtcIsoDate(isoDate?: string): string {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toISOString().replace("T", " ").substring(0, 16)} UTC`;
}

export function getRelativeExpiry(
    isoDate?: string,
    referenceTimeMs: number = Date.now()
): RelativeExpiryInfo {
    if (!isoDate) {
        return { label: "Non définie", tone: "neutral" };
    }
    const targetTime = new Date(isoDate).getTime();
    if (Number.isNaN(targetTime)) {
        return { label: "Non définie", tone: "neutral" };
    }

    const diffMs = targetTime - referenceTimeMs;
    if (diffMs <= 0) {
        return { label: "Attente oracle", tone: "warning" };
    }

    const diffMinutes = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMinutes < 60) {
        return { label: `Dans ${Math.max(1, diffMinutes)} min`, tone: "danger" };
    }
    if (diffHours < 24) {
        return { label: `Dans ${diffHours} h`, tone: "danger" };
    }
    if (diffDays === 1) {
        return { label: "Demain", tone: "warning" };
    }
    if (diffDays <= 2) {
        return { label: `Dans ${diffDays} j`, tone: "warning" };
    }
    if (diffDays <= 7) {
        return { label: `Dans ${diffDays} j`, tone: "info" };
    }
    if (diffDays < 30) {
        return { label: `Dans ${diffDays} j`, tone: "neutral" };
    }
    const diffMonths = Math.floor(diffDays / 30.4);
    return { label: `Dans ${diffMonths} mois`, tone: "neutral" };
}
