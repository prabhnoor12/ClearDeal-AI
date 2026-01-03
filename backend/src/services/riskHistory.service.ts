// Risk history service: tracks and retrieves risk history with change detection
import * as riskHistoryRepository from '../repositories/riskHistory.repository';
import * as riskScoreRepository from '../repositories/riskScore.repository';
import { RiskHistory, RiskScore, RiskFlag } from '../types/risk.types';

// Configuration constants
const MAX_HISTORY_ENTRIES = 100;
const TREND_THRESHOLD = 5;
const DEFAULT_AVERAGE_DAYS = 30;

type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface RiskTrend {
  contractId: string;
  currentScore: number;
  previousScore: number | null;
  scoreChange: number;
  trend: TrendDirection;
  historyCount: number;
}

export interface FlagChanges {
  newFlags: RiskFlag[];
  resolvedFlags: RiskFlag[];
}

export interface RiskStatistics {
  averageScore: number;
  minScore: number;
  maxScore: number;
  volatility: number;
  entryCount: number;
}

/**
 * Retrieves the complete risk history for a contract
 */
export async function getRiskHistory(contractId: string): Promise<RiskHistory | null> {
  return riskHistoryRepository.findByContractId(contractId);
}

/**
 * Adds a new risk score entry to the contract's history
 * Automatically maintains history size limit
 */
export async function addRiskHistoryEntry(contractId: string, score: RiskScore): Promise<RiskHistory> {
  const history = await riskHistoryRepository.findByContractId(contractId);

  const historyEntry = {
    analyzedAt: score.calculatedAt,
    score: score.score,
    flags: score.flags,
  };

  if (history) {
    history.history.push(historyEntry);
    if (history.history.length > MAX_HISTORY_ENTRIES) {
      history.history = history.history.slice(-MAX_HISTORY_ENTRIES);
    }
    await riskHistoryRepository.update(contractId, history);
    return history;
  }

  const newHistory: RiskHistory = {
    contractId,
    history: [historyEntry],
  };
  return riskHistoryRepository.create(newHistory);
}

/**
 * Calculates the risk trend based on score changes
 */
export async function getRiskTrend(contractId: string): Promise<RiskTrend> {
  const [history, currentScore] = await Promise.all([
    getRiskHistory(contractId),
    riskScoreRepository.findByContractId(contractId),
  ]);

  if (!currentScore) {
    return createEmptyTrend(contractId);
  }

  const entries = history?.history ?? [];
  const previousEntry = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const previousScore: number | null = previousEntry?.score ?? null;
  const scoreChange = previousScore !== null ? currentScore.score - previousScore : 0;

  return {
    contractId,
    currentScore: currentScore.score,
    previousScore,
    scoreChange,
    trend: calculateTrendDirection(scoreChange),
    historyCount: entries.length,
  };
}

/**
 * Identifies flags that were added or resolved between the last two analyses
 */
export async function getRecentFlagChanges(contractId: string): Promise<FlagChanges> {
  const history = await getRiskHistory(contractId);

  if (!history || history.history.length < 2) {
    return { newFlags: [], resolvedFlags: [] };
  }

  const current = history.history[history.history.length - 1];
  const previous = history.history[history.history.length - 2];

  if (!current || !previous) {
    return { newFlags: [], resolvedFlags: [] };
  }

  const currentCodes = new Set(current.flags.map(f => f.code));
  const previousCodes = new Set(previous.flags.map(f => f.code));

  return {
    newFlags: current.flags.filter(f => !previousCodes.has(f.code)),
    resolvedFlags: previous.flags.filter(f => !currentCodes.has(f.code)),
  };
}

/**
 * Calculates the average risk score over a specified time period
 */
export async function getAverageScoreOverTime(
  contractId: string,
  days: number = DEFAULT_AVERAGE_DAYS
): Promise<number> {
  const history = await getRiskHistory(contractId);

  if (!history || history.history.length === 0) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = history.history.filter(e => new Date(e.analyzedAt) >= cutoffDate);

  if (recentEntries.length === 0) {
    return history.history[history.history.length - 1]?.score ?? 0;
  }

  const sum = recentEntries.reduce((acc, e) => acc + e.score, 0);
  return Math.round(sum / recentEntries.length);
}

/**
 * Calculates comprehensive statistics for risk history
 */
export async function getRiskStatistics(
  contractId: string,
  days: number = DEFAULT_AVERAGE_DAYS
): Promise<RiskStatistics> {
  const history = await getRiskHistory(contractId);

  if (!history || history.history.length === 0) {
    return { averageScore: 0, minScore: 0, maxScore: 0, volatility: 0, entryCount: 0 };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const entries = history.history.filter(e => new Date(e.analyzedAt) >= cutoffDate);

  if (entries.length === 0) {
    const lastScore = history.history[history.history.length - 1]?.score ?? 0;
    return { averageScore: lastScore, minScore: lastScore, maxScore: lastScore, volatility: 0, entryCount: 0 };
  }

  const scores = entries.map(e => e.score);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const average = sum / scores.length;
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - average, 2), 0) / scores.length;

  return {
    averageScore: Math.round(average),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    volatility: Math.round(Math.sqrt(variance) * 100) / 100,
    entryCount: entries.length,
  };
}

/**
 * Deletes risk history for a contract
 */
export async function deleteRiskHistory(contractId: string): Promise<void> {
  await riskHistoryRepository.deleteByContractId(contractId);
}

// Helper functions

function createEmptyTrend(contractId: string): RiskTrend {
  return {
    contractId,
    currentScore: 0,
    previousScore: null,
    scoreChange: 0,
    trend: 'stable',
    historyCount: 0,
  };
}

function calculateTrendDirection(scoreChange: number): TrendDirection {
  if (scoreChange > TREND_THRESHOLD) return 'improving';
  if (scoreChange < -TREND_THRESHOLD) return 'worsening';
  return 'stable';
}
