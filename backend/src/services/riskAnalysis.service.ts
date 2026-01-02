// Risk analysis service: orchestrates comprehensive risk analysis
import * as riskFlagRepository from '../repositories/riskFlag.repository';
import * as contractRepository from '../repositories/contract.repository';
import * as riskScoreRepository from '../repositories/riskScore.repository';
import { RiskAnalysis, RiskFlag, RiskScore } from '../types/risk.types';
import { callAI, AIRequest } from '../ai/ai.client';
import { mapRiskFlags } from '../ai/ai.mapper';
import { parseAIJson } from '../ai/ai.parser';
import { RISK_EXPLANATION_PROMPT } from '../ai/prompts/riskExplanation.prompt';
import { UNUSUAL_CLAUSE_PROMPT } from '../ai/prompts/unusualClause.prompt';
import { calculateScore } from '../scoring/score.engine';
import { ScoreEngineInput } from '../scoring/score.types';

export async function analyzeRisk(contractId: string): Promise<RiskAnalysis> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  // Extract contract text
  const contractText = contract.clauses.map(c => c.text).join('\n');

  // Get AI risk explanations
  const riskPrompt = RISK_EXPLANATION_PROMPT.replace('{{contractText}}', contractText);
  const riskResponse = await callAI({ prompt: riskPrompt, provider: 'openai', maxTokens: 2000, temperature: 0.3 });
  const riskParsed = parseAIJson(riskResponse.raw);
  const flags = mapRiskFlags(riskParsed?.risks || []);

  // Detect unusual clauses
  const unusualPrompt = UNUSUAL_CLAUSE_PROMPT.replace('{{contractText}}', contractText);
  const unusualResponse = await callAI({ prompt: unusualPrompt, provider: 'openai', maxTokens: 1500, temperature: 0.3 });
  const unusualParsed = parseAIJson(unusualResponse.raw);
  const unusualClauses = unusualParsed?.unusualClauses || [];

  // Calculate score
  const scoreInput: ScoreEngineInput = {
    contractId,
    clauses: contract.clauses.map(c => c.text),
    disclosures: contract.disclosures.filter(d => d.provided).map(d => d.name),
    addenda: contract.addenda.filter(a => a.included).map(a => a.name),
    unusualClauses: unusualClauses.map((u: any) => u.text),
    missingDocuments: contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name),
    state: 'CA', // TODO: Get from contract metadata
  };

  const scoreOutput = calculateScore(scoreInput);

  const riskScore: RiskScore = {
    contractId,
    score: scoreOutput.totalScore,
    calculatedAt: new Date().toISOString(),
    flags,
  };

  // Save risk score
  await riskScoreRepository.create(riskScore);

  // Generate explanations
  const explanations = flags.map(f => `${f.severity.toUpperCase()}: ${f.description}`);
  if (unusualClauses.length > 0) {
    explanations.push(`Found ${unusualClauses.length} unusual clause(s) that may need review.`);
  }

  const summary = generateRiskSummary(riskScore.score, flags, unusualClauses.length);

  return {
    contractId,
    summary,
    riskScore,
    explanations,
  };
}

function generateRiskSummary(score: number, flags: RiskFlag[], unusualCount: number): string {
  let riskLevel: string;
  if (score >= 80) riskLevel = 'Low Risk';
  else if (score >= 60) riskLevel = 'Moderate Risk';
  else if (score >= 40) riskLevel = 'Elevated Risk';
  else riskLevel = 'High Risk';

  const criticalFlags = flags.filter(f => f.severity === 'critical').length;
  const highFlags = flags.filter(f => f.severity === 'high').length;

  let summary = `${riskLevel} (Score: ${score}/100). `;

  if (criticalFlags > 0) {
    summary += `${criticalFlags} critical issue(s) found. `;
  }
  if (highFlags > 0) {
    summary += `${highFlags} high-priority issue(s) found. `;
  }
  if (unusualCount > 0) {
    summary += `${unusualCount} unusual clause(s) detected. `;
  }
  if (flags.length === 0 && unusualCount === 0) {
    summary += 'No significant risks detected.';
  }

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
