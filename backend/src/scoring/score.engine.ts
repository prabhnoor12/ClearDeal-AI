import { ScoreEngineInput, ScoreEngineOutput, ScoreWeights } from './score.types';
import { DEFAULT_SCORE_WEIGHTS } from './score.weights';

// Example scoring engine implementation
export function calculateScore(input: ScoreEngineInput, weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS): ScoreEngineOutput {
  // Calculate individual scores (dummy logic, replace with real)
  const clauseScore = input.clauses.length * weights.clause;
  const disclosureScore = input.disclosures.length * weights.disclosure;
  const addendumScore = input.addenda.length * weights.addendum;
  const unusualClauseScore = input.unusualClauses.length * weights.unusualClause;
  const missingDocumentScore = input.missingDocuments.length * weights.missingDocument;
  const stateComplianceScore = weights.stateCompliance; // Placeholder

  const breakdown = {
    clauseScore,
    disclosureScore,
    addendumScore,
    unusualClauseScore,
    missingDocumentScore,
    stateComplianceScore,
  };

  // Aggregate total score (dummy logic)
  const totalScore = Math.max(
    0,
    100 - (clauseScore + unusualClauseScore + missingDocumentScore)
  );

  // Flag if score is below threshold
  const flagged = totalScore < 60;

  return {
    contractId: input.contractId,
    totalScore,
    breakdown,
    weights,
    flagged,
    ...(flagged && { notes: 'High risk detected' }),
  };
}
