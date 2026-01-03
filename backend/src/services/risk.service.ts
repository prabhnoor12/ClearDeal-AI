// Risk service: Unified risk management service
import * as riskScoreService from './riskScore.service';
import * as riskHistoryService from './riskHistory.service';
import * as riskAnalysisService from './riskAnalysis.service';
import { RiskFlag, RiskScore, RiskAnalysis, RiskHistory } from '../types/risk.types';

export interface RiskOverview {
  contractId: string;
  currentScore: RiskScore | null;
  analysis: RiskAnalysis | null;
  history: RiskHistory | null;
  trend: riskHistoryService.RiskTrend | null;
}

export interface RiskSummary {
  contractId: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  flagCount: number;
  lastAnalyzed: string | null;
}

/**
 * Get comprehensive risk overview for a contract
 */
export async function getRiskOverview(contractId: string): Promise<RiskOverview> {
  const [currentScore, analysis, history, trend] = await Promise.all([
    riskScoreService.getRiskScore(contractId),
    riskAnalysisService.getRiskAnalysis(contractId),
    riskHistoryService.getRiskHistory(contractId),
    riskHistoryService.getRiskTrend(contractId).catch(() => null),
  ]);

  return {
    contractId,
    currentScore,
    analysis,
    history,
    trend,
  };
}

/**
 * Get risk summary for a contract
 */
export async function getRiskSummary(contractId: string): Promise<RiskSummary> {
  const score = await riskScoreService.getRiskScore(contractId);

  const severity = getSeverityFromScore(score?.score ?? 0);

  return {
    contractId,
    score: score?.score ?? 0,
    severity,
    flagCount: score?.flags?.length ?? 0,
    lastAnalyzed: score?.calculatedAt ?? null,
  };
}

/**
 * Get risk summaries for multiple contracts
 */
export async function getRiskSummaries(contractIds: string[]): Promise<RiskSummary[]> {
  return Promise.all(contractIds.map(getRiskSummary));
}

/**
 * Perform full risk assessment on a contract
 */
export async function assessRisk(
  contractId: string,
  options?: { skipAI?: boolean; forceRefresh?: boolean }
): Promise<RiskAnalysis> {
  const analysis = await riskAnalysisService.analyzeRisk(contractId, options);
  return analysis;
}

/**
 * Get high-risk contracts from a list
 */
export async function getHighRiskContracts(
  contractIds: string[],
  threshold: number = 70
): Promise<RiskSummary[]> {
  const summaries = await getRiskSummaries(contractIds);
  return summaries.filter(s => s.score >= threshold);
}

/**
 * Get risk flags for a contract
 */
export async function getRiskFlags(contractId: string): Promise<RiskFlag[]> {
  const score = await riskScoreService.getRiskScore(contractId);
  return score?.flags ?? [];
}

/**
 * Clear all risk data for a contract
 */
export async function clearRiskData(contractId: string): Promise<void> {
  await Promise.all([
    riskScoreService.deleteRiskScore(contractId),
    riskHistoryService.deleteRiskHistory(contractId),
    riskAnalysisService.clearAnalysisCache(contractId),
  ]);
}

/**
 * Helper: Get severity from score
 */
function getSeverityFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
