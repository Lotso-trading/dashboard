/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert";
import type { OpenPosition } from "@polymarket-copy/shared";

interface ClosedPositionsTotals {
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

function calculatePositionsSummary(positions: OpenPosition[]): ClosedPositionsTotals {
  const count: number = positions.length;
  const totalInvested: number = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.totalInvestedUsdc || 0),
    0
  );
  const totalPayout: number = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.settledPayoutUsdc || 0),
    0
  );
  const totalGains: number = positions
    .filter((p: OpenPosition): boolean => (p.realizedPnlUsdc ?? 0) > 0)
    .reduce((acc: number, p: OpenPosition): number => acc + (p.realizedPnlUsdc ?? 0), 0);
  const totalLosses: number = positions
    .filter((p: OpenPosition): boolean => (p.realizedPnlUsdc ?? 0) < 0)
    .reduce((acc: number, p: OpenPosition): number => acc + Math.abs(p.realizedPnlUsdc ?? 0), 0);
  const netPnl: number = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.realizedPnlUsdc ?? 0),
    0
  );
  const totalShares: number = positions.reduce(
    (acc: number, p: OpenPosition): number => acc + (p.totalShares || 0),
    0
  );
  const avgEntryPrice: number = totalShares > 0 ? totalInvested / totalShares : 0;
  const winCount: number = positions.filter(
    (p: OpenPosition): boolean => p.closeReason === "RESOLVED_WIN"
  ).length;
  const lossCount: number = positions.filter(
    (p: OpenPosition): boolean => p.closeReason === "RESOLVED_LOSS"
  ).length;
  const winRate: number = count > 0 ? (winCount / count) * 100 : 0;
  const roiPercent: number = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;

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
