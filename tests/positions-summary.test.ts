/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { OpenPosition } from "@polymarket-copy/shared";
import {
  calculatePositionsSummary,
  filterPositionsLast24h,
} from "../src/utils/positions-summary.ts";

const mockWinPosition1: OpenPosition = {
  id: "pos_win_1",
  conditionId: "0x111",
  assetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  marketSlug: "win-1",
  marketQuestion: "Will Team A win?",
  outcomeLabel: "Yes",
  status: "CLOSED",
  closeReason: "RESOLVED_WIN",
  totalShares: 100,
  avgEntryPrice: 0.4,
  totalInvestedUsdc: 40,
  settledPayoutUsdc: 100,
  realizedPnlUsdc: 60, // Gain = +60
  currentMarketPrice: 1.0,
  currentMarketValueUsdc: 100,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  openedAt: 1700000000,
  updatedAt: 1700001000,
  closedAt: 1700001000,
};

const mockWinPosition2: OpenPosition = {
  id: "pos_win_2",
  conditionId: "0x222",
  assetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  marketSlug: "win-2",
  marketQuestion: "Will Team B win?",
  outcomeLabel: "No",
  status: "CLOSED",
  closeReason: "RESOLVED_WIN",
  totalShares: 50,
  avgEntryPrice: 0.5,
  totalInvestedUsdc: 25,
  settledPayoutUsdc: 50,
  realizedPnlUsdc: 25, // Gain = +25
  currentMarketPrice: 1.0,
  currentMarketValueUsdc: 50,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  openedAt: 1700000000,
  updatedAt: 1700001000,
  closedAt: 1700001000,
};

const mockLossPosition1: OpenPosition = {
  id: "pos_loss_1",
  conditionId: "0x333",
  assetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  marketSlug: "loss-1",
  marketQuestion: "Will Team C win?",
  outcomeLabel: "Yes",
  status: "CLOSED",
  closeReason: "RESOLVED_LOSS",
  totalShares: 60,
  avgEntryPrice: 0.5,
  totalInvestedUsdc: 30,
  settledPayoutUsdc: 0,
  realizedPnlUsdc: -30, // Perte = 30
  currentMarketPrice: 0.0,
  currentMarketValueUsdc: 0,
  unrealizedPnlUsdc: 0,
  unrealizedPnlPercent: 0,
  targetAddress: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  openedAt: 1700000000,
  updatedAt: 1700001000,
  closedAt: 1700001000,
};

Deno.test("calculatePositionsSummary - calcule correctement les gains, pertes, payout et résultat net", () => {
  const summary = calculatePositionsSummary([
    mockWinPosition1,
    mockWinPosition2,
    mockLossPosition1,
  ]);

  assertEquals(summary.count, 3);
  assertEquals(summary.winCount, 2);
  assertEquals(summary.lossCount, 1);
  assertEquals(summary.totalInvested, 95); // 40 + 25 + 30
  assertEquals(summary.totalPayout, 150); // 100 + 50 + 0
  assertEquals(summary.totalGains, 85); // 60 + 25
  assertEquals(summary.totalLosses, 30); // 30
  assertEquals(summary.netPnl, 55); // 85 - 30 = 55 (et 150 - 95 = 55)
  assertEquals(Math.round(summary.winRate * 10) / 10, 66.7);
});

Deno.test("calculatePositionsSummary - cas limite : liste vide sans division par zéro", () => {
  const summary = calculatePositionsSummary([]);

  assertEquals(summary.count, 0);
  assertEquals(summary.winCount, 0);
  assertEquals(summary.lossCount, 0);
  assertEquals(summary.totalInvested, 0);
  assertEquals(summary.totalPayout, 0);
  assertEquals(summary.totalGains, 0);
  assertEquals(summary.totalLosses, 0);
  assertEquals(summary.netPnl, 0);
  assertEquals(summary.avgEntryPrice, 0);
  assertEquals(summary.winRate, 0);
  assertEquals(summary.roiPercent, 0);
});

Deno.test("calculatePositionsSummary - filtre victoires uniquement", () => {
  const wins = [mockWinPosition1, mockWinPosition2];
  const summary = calculatePositionsSummary(wins);

  assertEquals(summary.count, 2);
  assertEquals(summary.totalInvested, 65);
  assertEquals(summary.totalPayout, 150);
  assertEquals(summary.totalGains, 85);
  assertEquals(summary.totalLosses, 0);
  assertEquals(summary.netPnl, 85);
  assertEquals(summary.winRate, 100);
});

Deno.test("calculatePositionsSummary - filtre défaites uniquement", () => {
  const losses = [mockLossPosition1];
  const summary = calculatePositionsSummary(losses);

  assertEquals(summary.count, 1);
  assertEquals(summary.totalInvested, 30);
  assertEquals(summary.totalPayout, 0);
  assertEquals(summary.totalGains, 0);
  assertEquals(summary.totalLosses, 30);
  assertEquals(summary.netPnl, -30);
  assertEquals(summary.winRate, 0);
});

Deno.test("filterPositionsLast24h - isole les positions des dernières 24h et ignore les antérieures", () => {
  const now = 1731000000000;
  const recentPos: OpenPosition = {
    ...mockWinPosition1,
    id: "recent-1",
    closedAt: now - 3_600_000, // Il y a 1 heure
  };
  const borderPos: OpenPosition = {
    ...mockWinPosition2,
    id: "border-1",
    closedAt: now - 24 * 3_600_000, // Pile 24h
  };
  const oldPos: OpenPosition = {
    ...mockLossPosition1,
    id: "old-1",
    closedAt: now - 25 * 3_600_000, // Il y a 25 heures
  };

  const filtered = filterPositionsLast24h([recentPos, borderPos, oldPos], now);
  assertEquals(filtered.length, 2);
  assertEquals(filtered[0]?.id, "recent-1");
  assertEquals(filtered[1]?.id, "border-1");
});
