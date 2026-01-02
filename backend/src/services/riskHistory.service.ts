// Risk history service: tracks and retrieves risk history with change detection
import * as riskHistoryRepository from '../repositories/riskHistory.repository';
import * as riskScoreRepository from '../repositories/riskScore.repository';
import { RiskHistory, RiskScore, RiskFlag } from '../types/risk.types';

export interface RiskTrend {
  contractId: string;
  currentScore: number;
  previousScore: number | null;
  scoreChange: number;
  trend: 'improving' | 'stable' | 'worsening';
  historyCount: number;
}

export async function getRiskHistory(contractId: string): Promise<RiskHistory | null> {
  return riskHistoryRepository.findByContractId(contractId);
}

export async function addRiskHistoryEntry(contractId: string, score: RiskScore): Promise<RiskHistory> {
  let history = await riskHistoryRepository.findByContractId(contractId);

  const historyEntry = {
    analyzedAt: score.calculatedAt,
    score: score.score,
    flags: score.flags,
  };

  if (history) {
    history.history.push(historyEntry);
    // Keep only last 100 entries
    if (history.history.length > 100) {
      history.history = history.history.slice(-100);
    }
    await riskHistoryRepository.update(contractId, history);
    return history;
  } else {
    history = {
      contractId,
      history: [historyEntry],
    };
    return riskHistoryRepository.create(history);
  }
}

export async function getRiskTrend(contractId: string): Promise<RiskTrend> {
  const history = await getRiskHistory(contractId);
  const currentScore = await riskScoreRepository.findByContractId(contractId);

  if (!currentScore) {
    return {
      contractId,
      currentScore: 0,
      previousScore: null,
      scoreChange: 0,
      trend: 'stable',
      historyCount: 0,
    };
  }

  const entries = history?.history || [];
  const previousScore = entries.length > 1 ? entries[entries.length - 2]?.score : null;
  const scoreChange = previousScore !== null ? currentScore.score - previousScore : 0;

  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (scoreChange > 5) trend = 'improving';
  else if (scoreChange < -5) trend = 'worsening';

  return {
    contractId,
    currentScore: currentScore.score,
    previousScore,
    scoreChange,
    trend,
    historyCount: entries.length,
  };
}

export async function getRecentFlagChanges(contractId: string): Promise<{
  newFlags: RiskFlag[];
  resolvedFlags: RiskFlag[];
}> {
  const history = await getRiskHistory(contractId);
  if (!history || history.history.length < 2) {
    return { newFlags: [], resolvedFlags: [] };
  }

  const current = history.history[history.history.length - 1];
  const previous = history.history[history.history.length - 2];

  const currentCodes = new Set(current.flags.map(f => f.code));
  const previousCodes = new Set(previous.flags.map(f => f.code));

  const newFlags = current.flags.filter(f => !previousCodes.has(f.code));
  const resolvedFlags = previous.flags.filter(f => !currentCodes.has(f.code));

  return { newFlags, resolvedFlags };
}

export async function getAverageScoreOverTime(contractId: string, days = 30): Promise<number> {
  const history = await getRiskHistory(contractId);
  if (!history || history.history.length === 0) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = history.history.filter(e => new Date(e.analyzedAt) >= cutoffDate);
  if (recentEntries.length === 0) return history.history[history.history.length - 1]?.score || 0;

  const sum = recentEntries.reduce((acc, e) => acc + e.score, 0);
  return Math.round(sum / recentEntries.length);
}
