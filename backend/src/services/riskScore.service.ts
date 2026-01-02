// Risk score service: calculates, retrieves, and manages risk scores
import * as riskScoreRepository from '../repositories/riskScore.repository';
import * as contractRepository from '../repositories/contract.repository';
import { RiskScore, RiskFlag } from '../types/risk.types';
import { calculateScore } from '../scoring/score.engine';
import { ScoreEngineInput } from '../scoring/score.types';
import { addRiskHistoryEntry } from './riskHistory.service';

export async function getRiskScore(contractId: string): Promise<RiskScore | null> {
  return riskScoreRepository.findByContractId(contractId);
}

export async function calculateAndSaveRiskScore(contractId: string, flags: RiskFlag[] = []): Promise<RiskScore> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  const scoreInput: ScoreEngineInput = {
    contractId,
    clauses: contract.clauses.map(c => c.text),
    disclosures: contract.disclosures.filter(d => d.provided).map(d => d.name),
    addenda: contract.addenda.filter(a => a.included).map(a => a.name),
    unusualClauses: contract.clauses.filter(c => c.type === 'unusual').map(c => c.text),
    missingDocuments: contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name),
    state: 'CA', // TODO: Get from contract metadata
  };

  const scoreOutput = calculateScore(scoreInput);

  // Apply flag penalties
  let adjustedScore = scoreOutput.totalScore;
  for (const flag of flags) {
    switch (flag.severity) {
      case 'critical':
        adjustedScore -= 15;
        break;
      case 'high':
        adjustedScore -= 10;
        break;
      case 'medium':
        adjustedScore -= 5;
        break;
      case 'low':
        adjustedScore -= 2;
        break;
    }
  }
  adjustedScore = Math.max(0, Math.min(100, adjustedScore));

  const riskScore: RiskScore = {
    contractId,
    score: adjustedScore,
    calculatedAt: new Date().toISOString(),
    flags,
  };

  // Check if score already exists
  const existing = await riskScoreRepository.findByContractId(contractId);
  if (existing) {
    await riskScoreRepository.update(contractId, riskScore);
  } else {
    await riskScoreRepository.create(riskScore);
  }

  // Add to history
  await addRiskHistoryEntry(contractId, riskScore);

  return riskScore;
}

export async function addRiskScore(score: RiskScore): Promise<RiskScore> {
  return riskScoreRepository.create(score);
}

export async function updateRiskScore(contractId: string, updates: Partial<RiskScore>): Promise<RiskScore | null> {
  return riskScoreRepository.update(contractId, updates);
}

export function getRiskLevel(score: number): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (score >= 80) return 'low';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'elevated';
  if (score >= 20) return 'high';
  return 'critical';
}

export function formatRiskScoreForDisplay(score: RiskScore): {
  score: number;
  level: string;
  color: string;
  summary: string;
} {
  const level = getRiskLevel(score.score);
  const colors: Record<string, string> = {
    low: '#22c55e',
    moderate: '#eab308',
    elevated: '#f97316',
    high: '#ef4444',
    critical: '#991b1b',
  };

  return {
    score: score.score,
    level: level.charAt(0).toUpperCase() + level.slice(1),
    color: colors[level],
    summary: `${score.flags.length} risk flag(s) detected`,
  };
}
