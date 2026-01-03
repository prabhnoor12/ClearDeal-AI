// Risk score service: calculates, retrieves, and manages risk scores
import * as riskScoreRepository from '../repositories/riskScore.repository';
import * as contractRepository from '../repositories/contract.repository';
import { RiskScore, RiskFlag } from '../types/risk.types';
import { calculateScore } from '../scoring/score.engine';
import { ScoreEngineInput } from '../scoring/score.types';
import { addRiskHistoryEntry } from './riskHistory.service';

// Configuration constants
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const DEFAULT_STATE = 'CA';

const SEVERITY_PENALTIES: Record<RiskFlag['severity'], number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

const RISK_THRESHOLDS = {
  low: 80,
  moderate: 60,
  elevated: 40,
  high: 20,
} as const;

type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  elevated: '#f97316',
  high: '#ef4444',
  critical: '#991b1b',
};

export interface RiskScoreDisplay {
  score: number;
  level: string;
  color: string;
  summary: string;
  flagCount: number;
}

export interface RiskScoreCalculationResult {
  riskScore: RiskScore;
  previousScore: number | null;
  scoreChange: number;
}

/**
 * Retrieves the current risk score for a contract
 */
export async function getRiskScore(contractId: string): Promise<RiskScore | null> {
  return riskScoreRepository.findByContractId(contractId);
}

/**
 * Calculates and persists a risk score for a contract
 * Automatically tracks score history
 */
export async function calculateAndSaveRiskScore(
  contractId: string,
  flags: RiskFlag[] = []
): Promise<RiskScoreCalculationResult> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  const existing = await riskScoreRepository.findByContractId(contractId);
  const previousScore = existing?.score ?? null;

  const scoreInput = buildScoreInput(contract, contractId);
  const scoreOutput = calculateScore(scoreInput);
  const adjustedScore = applyFlagPenalties(scoreOutput.totalScore, flags);

  const riskScore: RiskScore = {
    contractId,
    score: adjustedScore,
    calculatedAt: new Date().toISOString(),
    flags,
  };

  await saveRiskScore(contractId, riskScore, !!existing);
  await addRiskHistoryEntry(contractId, riskScore);

  return {
    riskScore,
    previousScore,
    scoreChange: previousScore !== null ? adjustedScore - previousScore : 0,
  };
}

/**
 * Creates a new risk score record
 */
export async function addRiskScore(score: RiskScore): Promise<RiskScore> {
  return riskScoreRepository.create(score);
}

/**
 * Updates an existing risk score
 */
export async function updateRiskScore(
  contractId: string,
  updates: Partial<RiskScore>
): Promise<RiskScore | null> {
  return riskScoreRepository.update(contractId, updates);
}

/**
 * Deletes a risk score record
 */
export async function deleteRiskScore(contractId: string): Promise<void> {
  await riskScoreRepository.deleteByContractId(contractId);
}

/**
 * Determines the risk level based on score value
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.low) return 'low';
  if (score >= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score >= RISK_THRESHOLDS.elevated) return 'elevated';
  if (score >= RISK_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Formats a risk score for UI display
 */
export function formatRiskScoreForDisplay(score: RiskScore): RiskScoreDisplay {
  const level = getRiskLevel(score.score);

  return {
    score: score.score,
    level: capitalizeFirst(level),
    color: RISK_COLORS[level],
    summary: generateScoreSummary(score),
    flagCount: score.flags.length,
  };
}

/**
 * Batch retrieves risk scores for multiple contracts
 */
export async function getRiskScoresForContracts(
  contractIds: string[]
): Promise<Map<string, RiskScore>> {
  const scores = await Promise.all(
    contractIds.map(async id => ({
      id,
      score: await riskScoreRepository.findByContractId(id),
    }))
  );

  return new Map(
    scores
      .filter((s): s is { id: string; score: RiskScore } => s.score !== null)
      .map(s => [s.id, s.score])
  );
}

/**
 * Checks if a contract's risk level requires immediate attention
 */
export function requiresImmediateAttention(score: RiskScore): boolean {
  const level = getRiskLevel(score.score);
  return level === 'critical' || level === 'high';
}

/**
 * Gets flags filtered by minimum severity
 */
export function getFlagsBySeverity(
  score: RiskScore,
  minSeverity: RiskFlag['severity']
): RiskFlag[] {
  const severityOrder: RiskFlag['severity'][] = ['low', 'medium', 'high', 'critical'];
  const minIndex = severityOrder.indexOf(minSeverity);

  return score.flags.filter(f => severityOrder.indexOf(f.severity) >= minIndex);
}

// Helper functions

function buildScoreInput(contract: Awaited<ReturnType<typeof contractRepository.findById>>, contractId: string): ScoreEngineInput {
  if (!contract) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  return {
    contractId,
    clauses: contract.clauses.map(c => c.text),
    disclosures: contract.disclosures.filter(d => d.provided).map(d => d.name),
    addenda: contract.addenda.filter(a => a.included).map(a => a.name),
    unusualClauses: contract.clauses.filter(c => c.type === 'unusual').map(c => c.text),
    missingDocuments: contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name),
    state: DEFAULT_STATE, // TODO: Get from contract metadata
  };
}

function applyFlagPenalties(baseScore: number, flags: RiskFlag[]): number {
  const totalPenalty = flags.reduce((sum, flag) => sum + SEVERITY_PENALTIES[flag.severity], 0);
  return clampScore(baseScore - totalPenalty);
}

function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

async function saveRiskScore(contractId: string, score: RiskScore, exists: boolean): Promise<void> {
  if (exists) {
    await riskScoreRepository.update(contractId, score);
  } else {
    await riskScoreRepository.create(score);
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateScoreSummary(score: RiskScore): string {
  const flagCount = score.flags.length;
  if (flagCount === 0) {
    return 'No risk flags detected';
  }
  return `${flagCount} risk flag${flagCount === 1 ? '' : 's'} detected`;
}
