import { ID, Timestamp } from './common.types';

// Broker types placeholder

export interface Broker {
  id: ID;
  name: string;
  email: string;
  organizationId: ID;
  active: boolean;
}

export interface Agent {
  id: ID;
  name: string;
  email: string;
  organizationId: ID;
  brokerId?: ID;
  active: boolean;
}

export interface BrokerAnalytics {
  brokerId: ID;
  organizationId: ID;
  totalDeals: number;
  avgRiskScore: number;
  flaggedContracts: number;
  lastActive: Timestamp;
}

export interface BrokerSafetyStatus {
  brokerId: ID;
  status: 'safe' | 'warning' | 'critical';
  lastChecked: Timestamp;
  notes?: string;
}
