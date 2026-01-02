import { ID, Timestamp } from '../types/common.types';
import { RiskAnalysis, RiskScore } from '../types/risk.types';
import { Contract } from '../types/contract.types';

// Report types placeholder

export type ReportStatus = 'draft' | 'final' | 'archived';

export interface ReportMetadata {
  reportId: ID;
  contractId: ID;
  createdBy: ID;
  createdAt: Timestamp;
  status: ReportStatus;
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface Report {
  metadata: ReportMetadata;
  contract: Contract;
  risk: RiskAnalysis;
  score: RiskScore;
  sections: ReportSection[];
  pdfUrl?: string;
}
