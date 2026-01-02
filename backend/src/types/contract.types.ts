import { ID, Timestamp } from './common.types';

// Contract types placeholder

export interface Contract {
  id: ID;
  title: string;
  uploadedBy: ID;
  organizationId: ID;
  status: 'draft' | 'submitted' | 'reviewed' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  documents: Document[];
  clauses: Clause[];
  disclosures: Disclosure[];
  addenda: Addendum[];
}

export interface Document {
  id: ID;
  contractId: ID;
  type: 'pdf' | 'doc' | 'other';
  url: string;
  uploadedAt: Timestamp;
}

export interface Clause {
  id: ID;
  contractId: ID;
  text: string;
  type: 'standard' | 'unusual' | 'custom';
  flagged: boolean;
}

export interface Disclosure {
  id: ID;
  contractId: ID;
  name: string;
  required: boolean;
  provided: boolean;
}

export interface Addendum {
  id: ID;
  contractId: ID;
  name: string;
  included: boolean;
}
