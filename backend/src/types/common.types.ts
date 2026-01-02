// Common/shared types for ClearDeal AI

export type ID = string;
export type Timestamp = string; // ISO8601

export enum UserRole {
  AGENT = 'agent',
  BROKER = 'broker',
  ADMIN = 'admin',
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: ID;
}

export interface Organization {
  id: ID;
  name: string;
  type: 'brokerage' | 'team' | 'enterprise';
  createdAt: Timestamp;
}

export type Nullable<T> = T | null;
