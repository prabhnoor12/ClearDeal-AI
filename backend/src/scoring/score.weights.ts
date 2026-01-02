import { ScoreWeights } from './score.types';

// Default score weights for risk scoring
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  clause: 0.2,
  disclosure: 0.2,
  addendum: 0.1,
  unusualClause: 0.2,
  missingDocument: 0.2,
  stateCompliance: 0.1,
};
