// Risk analysis service: orchestrates comprehensive risk analysis

import * as contractRepository from '../repositories/contract.repository';
import * as riskScoreRepository from '../repositories/riskScore.repository';
import { RiskAnalysis, RiskFlag, RiskScore } from '../types/risk.types';
import { callAI } from '../ai/ai.client';
import { mapRiskFlags } from '../ai/ai.mapper';
import { parseAIJson } from '../ai/ai.parser';
import { RISK_EXPLANATION_PROMPT } from '../ai/prompts/riskExplanation.prompt';
import { UNUSUAL_CLAUSE_PROMPT } from '../ai/prompts/unusualClause.prompt';
import { calculateScore } from '../scoring/score.engine';
import { ScoreEngineInput } from '../scoring/score.types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisOptions {
  /** Skip AI calls and use cached/rule-based analysis only */
  skipAI?: boolean;
  /** Force re-analysis even if recent analysis exists */
  forceRefresh?: boolean;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;
}

export interface RiskRecommendation {
  priority: 'immediate' | 'soon' | 'optional';
  action: string;
  relatedFlag?: string;
}

// In-memory cache for analysis results (use Redis in production)
const analysisCache = new Map<string, { result: RiskAnalysis; timestamp: number }>();
const DEFAULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Core Analysis
// ============================================================================

export async function analyzeRisk(
  contractId: string,
  options: AnalysisOptions = {}
): Promise<RiskAnalysis> {
  const { skipAI = false, forceRefresh = false, cacheTTL = DEFAULT_CACHE_TTL } = options;

  // Check cache first (unless forceRefresh)
  if (!forceRefresh) {
    const cached = analysisCache.get(contractId);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      logger.debug(`[RiskAnalysis] Returning cached analysis for ${contractId}`);
      return cached.result;
    }
  }

  logger.info(`[RiskAnalysis] Starting analysis for contract ${contractId}`);
  const startTime = Date.now();

  const contract = await contractRepository.findById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  const contractText = contract.clauses.map(c => c.text).join('\n');
  let flags: RiskFlag[] = [];
  let unusualClauses: Array<{ text: string; reason?: string }> = [];

  // AI-powered analysis (unless skipped)
  if (!skipAI && contractText.length > 0) {
    try {
      const riskPrompt = RISK_EXPLANATION_PROMPT.replace('{{contractText}}', contractText);
      const riskResponse = await callAI({
        prompt: riskPrompt,
        provider: 'openai',
        maxTokens: 2000,
        temperature: 0.3,
      });
      const riskParsed = parseAIJson(riskResponse.raw);
      flags = mapRiskFlags(riskParsed?.risks || []);

      const unusualPrompt = UNUSUAL_CLAUSE_PROMPT.replace('{{contractText}}', contractText);
      const unusualResponse = await callAI({
        prompt: unusualPrompt,
        provider: 'openai',
        maxTokens: 1500,
        temperature: 0.3,
      });
      const unusualParsed = parseAIJson(unusualResponse.raw);
      unusualClauses = unusualParsed?.unusualClauses || [];
    } catch (error) {
      logger.error(`[RiskAnalysis] AI analysis failed for ${contractId}:`, error);
    }
  }

  const scoreInput: ScoreEngineInput = {
    contractId,
    clauses: contract.clauses.map(c => c.text),
    disclosures: contract.disclosures.filter(d => d.provided).map(d => d.name),
    addenda: contract.addenda.filter(a => a.included).map(a => a.name),
    unusualClauses: unusualClauses.map(u => u.text),
    missingDocuments: contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name),
    state: 'CA',
  };

  const scoreOutput = calculateScore(scoreInput);

  const riskScore: RiskScore = {
    contractId,
    score: scoreOutput.totalScore,
    calculatedAt: new Date().toISOString(),
    flags,
  };

  await riskScoreRepository.create(riskScore);

  const explanations = flags.map(f => `${f.severity.toUpperCase()}: ${f.description}`);
  if (unusualClauses.length > 0) {
    explanations.push(`Found ${unusualClauses.length} unusual clause(s) that may need review.`);
  }

  const summary = generateRiskSummary(riskScore.score, flags, unusualClauses.length);

  const result: RiskAnalysis = { contractId, summary, riskScore, explanations };

  // Cache the result
  analysisCache.set(contractId, { result, timestamp: Date.now() });
  logger.info(`[RiskAnalysis] Analysis completed in ${Date.now() - startTime}ms`);

  return result;
}

// ============================================================================
// Feature 1: Actionable Recommendations
// ============================================================================

/**
 * Generate actionable recommendations based on risk flags
 */
export async function getRecommendations(contractId: string): Promise<RiskRecommendation[]> {
  const analysis = await getRiskAnalysis(contractId);
  if (!analysis) throw new Error(`No risk analysis found for contract: ${contractId}`);

  const recommendations: RiskRecommendation[] = [];

  for (const flag of analysis.riskScore.flags) {
    recommendations.push(flagToRecommendation(flag));
  }

  if (analysis.riskScore.score < 40) {
    recommendations.push({
      priority: 'immediate',
      action: 'Request a thorough review by a real estate attorney before proceeding.',
    });
  } else if (analysis.riskScore.score < 60) {
    recommendations.push({
      priority: 'soon',
      action: 'Address flagged issues and consider negotiating better terms.',
    });
  }

  const priorityOrder = { immediate: 0, soon: 1, optional: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function flagToRecommendation(flag: RiskFlag): RiskRecommendation {
  const priorityMap: Record<RiskFlag['severity'], RiskRecommendation['priority']> = {
    critical: 'immediate',
    high: 'immediate',
    medium: 'soon',
    low: 'optional',
  };

  const actionMap: Record<string, string> = {
    MISSING_DISCLOSURE: 'Request all required disclosure documents from the seller.',
    UNUSUAL_CLAUSE: 'Have an attorney review the unusual clause before signing.',
    SHORT_INSPECTION: 'Negotiate for a longer inspection period (10-14 days recommended).',
    LOW_EARNEST: 'Consider increasing earnest money to strengthen the offer.',
    FINANCING_RISK: 'Ensure financing contingency terms protect your interests.',
  };

  return {
    priority: priorityMap[flag.severity],
    action: actionMap[flag.code] || `Review and address: ${flag.description}`,
    relatedFlag: flag.code,
  };
}

// ============================================================================
// Feature 2: Risk Trend Analysis
// ============================================================================

export interface RiskTrend {
  contractId: string;
  currentScore: number;
  previousScore: number | null;
  trend: 'improving' | 'worsening' | 'stable' | 'new';
  changePercent: number | null;
}

/**
 * Analyze risk score trends over time
 */
export async function getRiskTrend(contractId: string): Promise<RiskTrend> {
  const currentScore = await riskScoreRepository.findByContractId(contractId);
  if (!currentScore) throw new Error(`No risk score found for contract: ${contractId}`);

  const history = await riskScoreRepository.getScoreHistory?.(contractId) || [];

  if (history.length <= 1) {
    return {
      contractId,
      currentScore: currentScore.score,
      previousScore: null,
      trend: 'new',
      changePercent: null,
    };
  }

  const previousScore = history[history.length - 2]?.score ?? null;
  const scoreDiff = previousScore !== null ? currentScore.score - previousScore : 0;

  let trend: RiskTrend['trend'];
  if (Math.abs(scoreDiff) < 3) trend = 'stable';
  else if (scoreDiff > 0) trend = 'improving';
  else trend = 'worsening';

  return {
    contractId,
    currentScore: currentScore.score,
    previousScore,
    trend,
    changePercent: previousScore ? Math.round((scoreDiff / previousScore) * 100) : null,
  };
}

// ============================================================================
// Feature 3: Batch Analysis
// ============================================================================

export interface BatchAnalysisResult {
  completed: Array<{ contractId: string; analysis: RiskAnalysis }>;
  failed: Array<{ contractId: string; error: string }>;
  totalTime: number;
}

/**
 * Analyze multiple contracts in batch
 */
export async function analyzeRiskBatch(
  contractIds: string[],
  options: AnalysisOptions = {}
): Promise<BatchAnalysisResult> {
  const startTime = Date.now();
  const completed: BatchAnalysisResult['completed'] = [];
  const failed: BatchAnalysisResult['failed'] = [];

  logger.info(`[RiskAnalysis] Starting batch analysis for ${contractIds.length} contracts`);

  for (const contractId of contractIds) {
    try {
      const analysis = await analyzeRisk(contractId, options);
      completed.push({ contractId, analysis });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[RiskAnalysis] Batch failed for ${contractId}: ${message}`);
      failed.push({ contractId, error: message });
    }
  }

  const totalTime = Date.now() - startTime;
  logger.info(`[RiskAnalysis] Batch complete: ${completed.length}/${contractIds.length} in ${totalTime}ms`);

  return { completed, failed, totalTime };
}

// ============================================================================
// Helpers
// ============================================================================

function generateRiskSummary(score: number, flags: RiskFlag[], unusualCount: number): string {
  let riskLevel: string;
  if (score >= 80) riskLevel = 'Low Risk';
  else if (score >= 60) riskLevel = 'Moderate Risk';
  else if (score >= 40) riskLevel = 'Elevated Risk';
  else riskLevel = 'High Risk';

  const criticalFlags = flags.filter(f => f.severity === 'critical').length;
  const highFlags = flags.filter(f => f.severity === 'high').length;

  let summary = `${riskLevel} (Score: ${score}/100). `;
  if (criticalFlags > 0) summary += `${criticalFlags} critical issue(s) found. `;
  if (highFlags > 0) summary += `${highFlags} high-priority issue(s) found. `;
  if (unusualCount > 0) summary += `${unusualCount} unusual clause(s) detected. `;
  if (flags.length === 0 && unusualCount === 0) summary += 'No significant risks detected.';

  return summary.trim();
}

export async function getRiskAnalysis(contractId: string): Promise<RiskAnalysis | null> {
  const riskScore = await riskScoreRepository.findByContractId(contractId);
  if (!riskScore) return null;

  return {
    contractId,
    summary: generateRiskSummary(riskScore.score, riskScore.flags, 0),
    riskScore,
    explanations: riskScore.flags.map(f => `${f.severity.toUpperCase()}: ${f.description}`),
  };
}

/** Clear cached analysis for a contract */
export function clearAnalysisCache(contractId?: string): void {
  if (contractId) analysisCache.delete(contractId);
  else analysisCache.clear();
}
