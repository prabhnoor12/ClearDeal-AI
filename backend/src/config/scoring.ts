
// Scoring configuration for risk engine
export interface ScoringConfig {
	minScore: number;
	maxScore: number;
	defaultScore: number;
	unusualClauseWeight: number;
	missingDocWeight: number;
	stateComplianceWeight: number;
	baseWeights: Record<string, number>;
	thresholds: {
		low: number;
		medium: number;
		high: number;
	};
}

export const SCORING_CONFIG: ScoringConfig = {
	minScore: 0,
	maxScore: 100,
	defaultScore: 50,
	unusualClauseWeight: Number(process.env['SCORING_UNUSUAL_WEIGHT']) || 0.25,
	missingDocWeight: Number(process.env['SCORING_MISSINGDOC_WEIGHT']) || 0.2,
	stateComplianceWeight: Number(process.env['SCORING_STATE_WEIGHT']) || 0.3,
	baseWeights: {
		earnestMoney: Number(process.env['SCORING_EARNEST_WEIGHT']) || 0.1,
		financing: Number(process.env['SCORING_FINANCING_WEIGHT']) || 0.1,
		inspection: Number(process.env['SCORING_INSPECTION_WEIGHT']) || 0.1,
		disclosure: Number(process.env['SCORING_DISCLOSURE_WEIGHT']) || 0.1,
		contingency: Number(process.env['SCORING_CONTINGENCY_WEIGHT']) || 0.1,
	},
	thresholds: {
		low: Number(process.env['SCORING_LOW_THRESHOLD']) || 30,
		medium: Number(process.env['SCORING_MEDIUM_THRESHOLD']) || 60,
		high: Number(process.env['SCORING_HIGH_THRESHOLD']) || 85,
	},
};
