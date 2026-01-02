// Document check service: checks for missing documents and compliance
import * as documentRepository from '../repositories/document.repository';
import * as contractRepository from '../repositories/contract.repository';
import { Document, Disclosure, Contract } from '../types/contract.types';

// Required documents by state (extendable)
const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  CA: ['Transfer Disclosure Statement', 'Natural Hazard Disclosure', 'Lead-Based Paint Disclosure'],
  TX: ['Seller\'s Disclosure Notice', 'Lead-Based Paint Disclosure', 'Property Condition Addendum'],
  FL: ['Seller\'s Property Disclosure', 'Lead-Based Paint Disclosure', 'Condominium/HOA Disclosure'],
  NY: ['Property Condition Disclosure Statement', 'Lead-Based Paint Disclosure'],
  DEFAULT: ['Lead-Based Paint Disclosure', 'Purchase Agreement'],
};

export interface DocumentCheckResult {
  contractId: string;
  missingDocuments: string[];
  providedDocuments: string[];
  missingDisclosures: string[];
  providedDisclosures: string[];
  complianceScore: number;
  state: string;
}

export async function checkMissingDocuments(contractId: string, state = 'DEFAULT'): Promise<DocumentCheckResult> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  const requiredDocs = REQUIRED_DOCUMENTS[state] || REQUIRED_DOCUMENTS['DEFAULT'];
  const providedDocNames = contract.documents.map(d => d.url.split('/').pop() || '');
  const providedDisclosureNames = contract.disclosures.filter(d => d.provided).map(d => d.name);

  const missingDocuments = requiredDocs.filter(doc => !providedDocNames.some(p => p.toLowerCase().includes(doc.toLowerCase())));
  const providedDocuments = requiredDocs.filter(doc => providedDocNames.some(p => p.toLowerCase().includes(doc.toLowerCase())));

  const missingDisclosures = contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name);
  const providedDisclosures = contract.disclosures.filter(d => d.provided).map(d => d.name);

  const totalRequired = requiredDocs.length + contract.disclosures.filter(d => d.required).length;
  const totalProvided = providedDocuments.length + providedDisclosures.length;
  const complianceScore = totalRequired > 0 ? Math.round((totalProvided / totalRequired) * 100) : 100;

  return {
    contractId,
    missingDocuments,
    providedDocuments,
    missingDisclosures,
    providedDisclosures,
    complianceScore,
    state,
  };
}

export async function validateDocument(document: Document): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!document.url || document.url.trim() === '') {
    errors.push('Document URL is required');
  }

  if (!['pdf', 'doc', 'other'].includes(document.type)) {
    errors.push('Invalid document type');
  }

  return { valid: errors.length === 0, errors };
}

export async function addDocumentToContract(contractId: string, document: Omit<Document, 'id' | 'contractId'>): Promise<Document> {
  const newDoc: Document = {
    id: `doc_${Date.now()}`,
    contractId,
    type: document.type,
    url: document.url,
    uploadedAt: new Date().toISOString(),
  };

  return documentRepository.create(newDoc);
}

export function getRequiredDocumentsForState(state: string): string[] {
  return REQUIRED_DOCUMENTS[state] || REQUIRED_DOCUMENTS['DEFAULT'];
}
