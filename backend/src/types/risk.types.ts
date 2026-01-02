import { ID, Timestamp } from './common.types';

// Risk types placeholder

export interface RiskFlag {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskScore {
  contractId: ID;
  score: number; // 0-100
  calculatedAt: Timestamp;
  flags: RiskFlag[];
}

export interface RiskAnalysis {
  contractId: ID;
  summary: string;
  riskScore: RiskScore;
  explanations: string[];
}

export interface RiskHistory {
  contractId: ID;
  history: Array<{
    analyzedAt: Timestamp;
    score: number;
    flags: RiskFlag[];
  }>;
}
