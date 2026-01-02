import { ID, Timestamp } from './common.types';

// Scan types placeholder

export type ScanStatus = 'pending' | 'completed' | 'failed';

export interface ScanRequest {
  id: ID;
  documentUrl: string;
  requestedBy: ID;
  scanType: 'basic' | 'advanced' | 'custom';
  options?: Record<string, any>;
  requestedAt: Timestamp;
}

export interface ScanResult {
  id: ID;
  scanId: ID;
  findings: string[];
  score: number;
  completedAt: Timestamp;
  errors?: string[];
}

export interface ScanMetadata {
  scanId: ID;
  status: ScanStatus;
  requestedBy: ID;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
}
