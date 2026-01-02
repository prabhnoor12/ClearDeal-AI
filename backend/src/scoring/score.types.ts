import { ID } from '../types/common.types';

// Score types placeholder

export interface ScoreWeights {
  clause: number;
  disclosure: number;
  addendum: number;
  unusualClause: number;
  missingDocument: number;
  stateCompliance: number;
  [key: string]: number;
}

export interface ScoreBreakdown {
  clauseScore: number;
  disclosureScore: number;
  addendumScore: number;
  unusualClauseScore: number;
  missingDocumentScore: number;
  stateComplianceScore: number;
  [key: string]: number;
}

export interface ScoreEngineInput {
  contractId: ID;
  clauses: string[];
  disclosures: string[];
  addenda: string[];
  unusualClauses: string[];
  missingDocuments: string[];
  state: string;
}

export interface ScoreEngineOutput {
  contractId: ID;
  totalScore: number;
  breakdown: ScoreBreakdown;
  weights: ScoreWeights;
  flagged: boolean;
  notes?: string;
}
