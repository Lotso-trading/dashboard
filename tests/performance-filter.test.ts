/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { PerformancePoint } from "../src/api/http-client.ts";
import {
    filterPerformancePoints,
    formatTooltipDate,
    formatXTickLabel,
} from "../src/utils/performance-filter.ts";

const REF_TIME = 1700000000000; // Reference timestamp

const mockPoints: PerformancePoint[] = [
    {
        // Trade 1: il y a 5 jours
        timestamp: REF_TIME - 5 * 24 * 3600 * 1000,
        tradeId: "t1",
        side: "BUY",
        shares: 100,
        price: 0.5,
        costUsdc: 50,
        targetAddress: "0xWhaleA",
        targetAlias: "Baleine Alpha",
        myCumulativePnlUsdc: 0,
        portfolioValueUsdc: 1000,
        whaleCumulativeUsdc: 50,
    },
    {
        // Trade 2: il y a 2 jours
        timestamp: REF_TIME - 2 * 24 * 3600 * 1000,
        tradeId: "t2",
        side: "SELL",
        shares: 100,
        price: 0.8,
        costUsdc: 80,
        targetAddress: "0xWhaleA",
        targetAlias: "Baleine Alpha",
        myCumulativePnlUsdc: 30,
        portfolioValueUsdc: 1030,
        whaleCumulativeUsdc: 130,
    },
    {
        // Trade 3: il y a 12 heures
        timestamp: REF_TIME - 12 * 3600 * 1000,
        tradeId: "t3",
        side: "BUY",
        shares: 50,
        price: 0.6,
        costUsdc: 30,
        targetAddress: "0xWhaleB",
        targetAlias: "Baleine Beta",
        myCumulativePnlUsdc: 30,
        portfolioValueUsdc: 1030,
        whaleCumulativeUsdc: 160,
    },
    {
        // Trade 4: il y a 30 minutes
        timestamp: REF_TIME - 30 * 60 * 1000,
        tradeId: "t4",
        side: "SELL",
        shares: 50,
        price: 0.9,
        costUsdc: 45,
        targetAddress: "0xWhaleB",
        targetAlias: "Baleine Beta",
        myCumulativePnlUsdc: 45,
        portfolioValueUsdc: 1045,
        whaleCumulativeUsdc: 205,
    },
];

Deno.test("filterPerformancePoints - cas vide génère deux repères sur la période", () => {
    const res = filterPerformancePoints([], "24H", "ALL", 500, REF_TIME);
    assertEquals(res.points.length, 2);
    assertEquals(res.points[0]?.timestamp, REF_TIME - 24 * 3600 * 1000);
    assertEquals(res.points[0]?.portfolioValueUsdc, 500);
    assertEquals(res.points[1]?.timestamp, REF_TIME);
    assertEquals(res.points[1]?.portfolioValueUsdc, 500);
    assertEquals(res.timeRange.min, REF_TIME - 24 * 3600 * 1000);
    assertEquals(res.timeRange.max, REF_TIME);
});

Deno.test("filterPerformancePoints - ALL conserve tout l'historique et prolonge jusqu'à refTime", () => {
    const res = filterPerformancePoints(mockPoints, "ALL", "ALL", 1000, REF_TIME);
    assertEquals(res.timeRange.min, mockPoints[0]?.timestamp);
    assertEquals(res.timeRange.max, REF_TIME);

    // 4 trades d'origine + 1 point de prolongement final
    assertEquals(res.points.length, 5);
    const lastPoint = res.points[res.points.length - 1];
    assertEquals(lastPoint?.timestamp, REF_TIME);
    assertEquals(lastPoint?.portfolioValueUsdc, 1045);
    assertEquals(lastPoint?.myCumulativePnlUsdc, 45);
});

Deno.test("filterPerformancePoints - 24H isole les trades des dernières 24h et interpole le cutoff", () => {
    const res = filterPerformancePoints(mockPoints, "24H", "ALL", 1000, REF_TIME);
    const cutoff = REF_TIME - 24 * 3600 * 1000;

    assertEquals(res.timeRange.min, cutoff);
    assertEquals(res.timeRange.max, REF_TIME);

    // Point 0 = cutoff hérité du Trade 2 (t2: il y a 2 jours, capital = 1030)
    assertEquals(res.points[0]?.timestamp, cutoff);
    assertEquals(res.points[0]?.portfolioValueUsdc, 1030);
    assertEquals(res.points[0]?.myCumulativePnlUsdc, 30);
    assertEquals(res.points[0]?.tradeId, undefined); // Point frontière sans marqueur

    // Point 1 = Trade 3 (12h avant)
    assertEquals(res.points[1]?.tradeId, "t3");

    // Point 2 = Trade 4 (30m avant)
    assertEquals(res.points[2]?.tradeId, "t4");

    // Point 3 = Terminal à REF_TIME
    const terminal = res.points[res.points.length - 1];
    assertEquals(terminal?.timestamp, REF_TIME);
    assertEquals(terminal?.portfolioValueUsdc, 1045);
});

Deno.test("filterPerformancePoints - 1H isole les trades des 60 dernières minutes", () => {
    const res = filterPerformancePoints(mockPoints, "1H", "ALL", 1000, REF_TIME);
    const cutoff = REF_TIME - 3600 * 1000;

    assertEquals(res.timeRange.min, cutoff);
    assertEquals(res.timeRange.max, REF_TIME);

    // Seul Trade 4 est survenu dans la dernière heure
    const realTrades = res.points.filter((p) => p.side !== undefined);
    assertEquals(realTrades.length, 1);
    assertEquals(realTrades[0]?.tradeId, "t4");

    // Point frontière à cutoff avec l'état avant Trade 4 (capital = 1030)
    assertEquals(res.points[0]?.timestamp, cutoff);
    assertEquals(res.points[0]?.portfolioValueUsdc, 1030);

    // Point terminal à REF_TIME (capital = 1045)
    assertEquals(res.points[res.points.length - 1]?.timestamp, REF_TIME);
    assertEquals(res.points[res.points.length - 1]?.portfolioValueUsdc, 1045);
});

Deno.test("filterPerformancePoints - 3J englobe les trades jusqu'à 3 jours", () => {
    const res = filterPerformancePoints(mockPoints, "3J", "ALL", 1000, REF_TIME);
    const cutoff = REF_TIME - 3 * 24 * 3600 * 1000;

    assertEquals(res.timeRange.min, cutoff);
    assertEquals(res.timeRange.max, REF_TIME);

    // Trades inclus : t2 (2j), t3 (12h), t4 (30m) => 3 trades réels
    const realTrades = res.points.filter((p) => p.side !== undefined);
    assertEquals(realTrades.length, 3);
    assertEquals(realTrades[0]?.tradeId, "t2");
    assertEquals(realTrades[1]?.tradeId, "t3");
    assertEquals(realTrades[2]?.tradeId, "t4");
});

Deno.test("filterPerformancePoints - filtre combiné Baleine + Période", () => {
    // Filtrer uniquement WhaleA sur 24H (WhaleA n'a pas tradé dans les dernières 24h)
    const res = filterPerformancePoints(mockPoints, "24H", "0xWhaleA", 1000, REF_TIME);
    const cutoff = REF_TIME - 24 * 3600 * 1000;

    assertEquals(res.timeRange.min, cutoff);
    assertEquals(res.timeRange.max, REF_TIME);

    // Aucun trade réel dans la fenêtre 24h pour WhaleA
    const realTrades = res.points.filter((p) => p.side !== undefined);
    assertEquals(realTrades.length, 0);

    // Ligne stable au dernier niveau atteint par WhaleA (1030)
    assertEquals(res.points[0]?.portfolioValueUsdc, 1030);
    assertEquals(res.points[res.points.length - 1]?.portfolioValueUsdc, 1030);
});

Deno.test("formatXTickLabel - adapte le libellé selon la granularité", () => {
    const date = new Date(REF_TIME);

    const label1H = formatXTickLabel(date, "1H", 3600000);
    assertEquals(typeof label1H, "string");
    assertEquals(label1H.length > 0, true);

    const label24H = formatXTickLabel(date, "24H", 86400000);
    assertEquals(typeof label24H, "string");

    const label3J = formatXTickLabel(date, "3J", 3 * 86400000);
    assertEquals(typeof label3J, "string");

    const label1M = formatXTickLabel(date, "1M", 30 * 86400000);
    assertEquals(typeof label1M, "string");

    const labelAllShort = formatXTickLabel(date, "ALL", 3600000);
    assertEquals(typeof labelAllShort, "string");
});

Deno.test("formatTooltipDate - formate avec heure ou date complète", () => {
    const tt1H = formatTooltipDate(REF_TIME, "1H");
    const tt24H = formatTooltipDate(REF_TIME, "24H");
    const tt3J = formatTooltipDate(REF_TIME, "3J");
    const tt1M = formatTooltipDate(REF_TIME, "1M");
    const ttAll = formatTooltipDate(REF_TIME, "ALL");

    assertEquals(typeof tt1H, "string");
    assertEquals(typeof tt24H, "string");
    assertEquals(typeof tt3J, "string");
    assertEquals(typeof tt1M, "string");
    assertEquals(typeof ttAll, "string");
});
