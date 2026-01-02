// Document check service: checks for missing documents and compliance
import * as documentRepository from '../repositories/document.repository';
import * as contractRepository from '../repositories/contract.repository';
import { Document } from '../types/contract.types';
import { callAI, AIRequest } from '../ai/ai.client';
import { parseAIJson } from '../ai/ai.parser';

// Required documents by state (extendable)
const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  CA: ['Transfer Disclosure Statement', 'Natural Hazard Disclosure', 'Lead-Based Paint Disclosure', 'Seller Property Questionnaire'],
  TX: ['Seller\'s Disclosure Notice', 'Lead-Based Paint Disclosure', 'Property Condition Addendum', 'Residential Service Contract'],
  FL: ['Seller\'s Property Disclosure', 'Lead-Based Paint Disclosure', 'Condominium/HOA Disclosure', 'Property Tax Disclosure'],
  NY: ['Property Condition Disclosure Statement', 'Lead-Based Paint Disclosure', 'Co-op/Condo Disclosure'],
  IL: ['Residential Real Property Disclosure', 'Lead-Based Paint Disclosure', 'Radon Disclosure'],
  WA: ['Seller Disclosure Statement', 'Lead-Based Paint Disclosure', 'Form 17'],
  DEFAULT: ['Lead-Based Paint Disclosure', 'Purchase Agreement'],
};

// Document criticality levels
const DOCUMENT_CRITICALITY: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'Lead-Based Paint Disclosure': 'critical',
  'Purchase Agreement': 'critical',
  'Transfer Disclosure Statement': 'high',
  'Natural Hazard Disclosure': 'high',
  'Seller\'s Disclosure Notice': 'high',
  'Property Condition Disclosure Statement': 'high',
};

export interface DocumentCheckResult {
  contractId: string;
  missingDocuments: string[];
  providedDocuments: string[];
  missingDisclosures: string[];
  providedDisclosures: string[];
  complianceScore: number;
  state: string;
  criticalMissing: string[];
  warnings: string[];
}

export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface BulkDocumentResult {
  successful: Document[];
  failed: Array<{ document: Omit<Document, 'id' | 'contractId'>; error: string }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface DocumentCompletenessReport {
  contractId: string;
  totalRequired: number;
  totalProvided: number;
  completenessPercentage: number;
  documentsByCategory: {
    critical: { required: string[]; missing: string[]; provided: string[] };
    high: { required: string[]; missing: string[]; provided: string[] };
    medium: { required: string[]; missing: string[]; provided: string[] };
    low: { required: string[]; missing: string[]; provided: string[] };
  };
  recommendations: string[];
}

export async function checkMissingDocuments(contractId: string, state = 'DEFAULT'): Promise<DocumentCheckResult> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  const requiredDocs = REQUIRED_DOCUMENTS[state] || REQUIRED_DOCUMENTS['DEFAULT'];
  const providedDocNames = contract.documents.map(d => d.url.split('/').pop() || '');

  const missingDocuments = requiredDocs?.filter(doc => !providedDocNames.some(p => p.toLowerCase().includes(doc.toLowerCase()))) || [];
  const providedDocuments = requiredDocs?.filter(doc => providedDocNames.some(p => p.toLowerCase().includes(doc.toLowerCase()))) || [];

  const missingDisclosures = contract.disclosures.filter(d => d.required && !d.provided).map(d => d.name);
  const providedDisclosures = contract.disclosures.filter(d => d.provided).map(d => d.name);

  const totalRequired = (requiredDocs?.length || 0) + contract.disclosures.filter(d => d.required).length;
  const totalProvided = providedDocuments.length + providedDisclosures.length;
  const complianceScore = totalRequired > 0 ? Math.round((totalProvided / totalRequired) * 100) : 100;

  // Identify critical missing documents
  const criticalMissing = missingDocuments.filter(doc => 
    DOCUMENT_CRITICALITY[doc] === 'critical' || DOCUMENT_CRITICALITY[doc] === 'high'
  );

  // Generate warnings
  const warnings: string[] = [];
  if (criticalMissing.length > 0) {
    warnings.push(`Missing ${criticalMissing.length} critical/high priority document(s)`);
  }
  if (complianceScore < 50) {
    warnings.push('Compliance score is below 50%');
  }
  if (missingDisclosures.length > 0) {
    warnings.push(`${missingDisclosures.length} required disclosure(s) not provided`);
  }

  return {
    contractId,
    missingDocuments,
    providedDocuments,
    missingDisclosures,
    providedDisclosures,
    complianceScore,
    state,
    criticalMissing,
    warnings,
  };
}

export async function validateDocument(document: Document): Promise<DocumentValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!document.url || document.url.trim() === '') {
    errors.push('Document URL is required');
  }

  if (!['pdf', 'doc', 'other'].includes(document.type)) {
    errors.push('Invalid document type');
  }

  // URL validation
  if (document.url && !isValidUrl(document.url)) {
    errors.push('Document URL is not valid');
  }

  // File type warnings
  if (document.type === 'other') {
    warnings.push('Document type is not PDF or DOC - may need manual review');
  }

  // Suggestions
  if (document.type === 'doc') {
    suggestions.push('Consider converting to PDF for better compatibility');
  }

  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Enhanced document validation with file size and format checks
 */
export async function validateDocumentEnhanced(
  document: Document, 
  fileSize?: number, 
  fileName?: string
): Promise<DocumentValidationResult> {
  const basicValidation = await validateDocument(document);
  const warnings = [...basicValidation.warnings];
  const errors = [...basicValidation.errors];
  const suggestions = [...basicValidation.suggestions];

  // File size validation (example: max 50MB)
  if (fileSize && fileSize > 50 * 1024 * 1024) {
    errors.push('Document exceeds maximum file size of 50MB');
  }

  // File name validation
  if (fileName) {
    if (fileName.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }
    if (!/^[a-zA-Z0-9_\-. ]+$/.test(fileName)) {
      warnings.push('File name contains special characters');
    }
  }

  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Bulk document upload/validation
 */
export async function addMultipleDocuments(
  contractId: string, 
  documents: Array<Omit<Document, 'id' | 'contractId'>>
): Promise<BulkDocumentResult> {
  const successful: Document[] = [];
  const failed: Array<{ document: Omit<Document, 'id' | 'contractId'>; error: string }> = [];

  for (const doc of documents) {
    try {
      const validation = await validateDocument({ ...doc, id: '', contractId });
      if (!validation.valid) {
        failed.push({ document: doc, error: validation.errors.join(', ') });
        continue;
      }

      const newDoc = await addDocumentToContract(contractId, doc);
      successful.push(newDoc);
    } catch (error: any) {
      failed.push({ document: doc, error: error.message || 'Unknown error' });
    }
  }

  return {
    successful,
    failed,
    summary: {
      total: documents.length,
      succeeded: successful.length,
      failed: failed.length,
    },
  };
}

/**
 * Generate comprehensive document completeness report
 */
export async function generateDocumentCompletenessReport(
  contractId: string, 
  state = 'DEFAULT'
): Promise<DocumentCompletenessReport> {
  const checkResult = await checkMissingDocuments(contractId, state);
  const requiredDocs = REQUIRED_DOCUMENTS[state] || REQUIRED_DOCUMENTS['DEFAULT'];

  const documentsByCategory = {
    critical: { required: [] as string[], missing: [] as string[], provided: [] as string[] },
    high: { required: [] as string[], missing: [] as string[], provided: [] as string[] },
    medium: { required: [] as string[], missing: [] as string[], provided: [] as string[] },
    low: { required: [] as string[], missing: [] as string[], provided: [] as string[] },
  };

  // Categorize documents by criticality
  requiredDocs?.forEach(doc => {
    const criticality = DOCUMENT_CRITICALITY[doc] || 'medium';
    documentsByCategory[criticality].required.push(doc);
    
    if (checkResult.missingDocuments.includes(doc)) {
      documentsByCategory[criticality].missing.push(doc);
    } else if (checkResult.providedDocuments.includes(doc)) {
      documentsByCategory[criticality].provided.push(doc);
    }
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (documentsByCategory.critical.missing.length > 0) {
    recommendations.push(`Immediately upload critical documents: ${documentsByCategory.critical.missing.join(', ')}`);
  }
  if (documentsByCategory.high.missing.length > 0) {
    recommendations.push(`High priority documents needed: ${documentsByCategory.high.missing.join(', ')}`);
  }
  if (checkResult.complianceScore === 100) {
    recommendations.push('All required documents are provided. Review for accuracy and completeness.');
  }

  return {
    contractId,
    totalRequired: checkResult.missingDocuments.length + checkResult.providedDocuments.length,
    totalProvided: checkResult.providedDocuments.length,
    completenessPercentage: checkResult.complianceScore,
    documentsByCategory,
    recommendations,
  };
}

/**
 * AI-powered document classification
 */
export async function classifyDocumentWithAI(documentText: string): Promise<{
  documentType: string;
  confidence: number;
  suggestedCategory: string;
}> {
  const prompt = `Analyze this real estate document and classify it. 
  
Document text excerpt:
${documentText.substring(0, 1000)}

Classify this document as one of:
- Transfer Disclosure Statement
- Natural Hazard Disclosure
- Lead-Based Paint Disclosure
- Purchase Agreement
- Property Condition Disclosure
- Seller's Disclosure Notice
- Other

Respond with JSON: { "documentType": "...", "confidence": 0-100, "suggestedCategory": "..." }`;

  const aiRequest: AIRequest = {
    prompt,
    provider: 'openai',
    maxTokens: 500,
    temperature: 0.2,
  };

  const aiResponse = await callAI(aiRequest);
  if (aiResponse.error) {
    throw new Error(`AI classification failed: ${aiResponse.error}`);
  }

  const parsed = parseAIJson(aiResponse.raw);
  return {
    documentType: parsed?.documentType || 'Unknown',
    confidence: parsed?.confidence || 0,
    suggestedCategory: parsed?.suggestedCategory || 'other',
  };
}

/**
 * Compare documents across contracts
 */
export async function compareDocuments(contractId1: string, contractId2: string): Promise<{
  contract1Only: string[];
  contract2Only: string[];
  common: string[];
  comparisonScore: number;
}> {
  const [contract1, contract2] = await Promise.all([
    contractRepository.findById(contractId1),
    contractRepository.findById(contractId2),
  ]);

  if (!contract1 || !contract2) {
    throw new Error('One or both contracts not found');
  }

  const docs1 = contract1.documents.map(d => d.url.split('/').pop() || '');
  const docs2 = contract2.documents.map(d => d.url.split('/').pop() || '');

  const contract1Only = docs1.filter(d => !docs2.includes(d));
  const contract2Only = docs2.filter(d => !docs1.includes(d));
  const common = docs1.filter(d => docs2.includes(d));

  const totalUnique = new Set([...docs1, ...docs2]).size;
  const comparisonScore = totalUnique > 0 ? Math.round((common.length / totalUnique) * 100) : 0;

  return {
    contract1Only,
    contract2Only,
    common,
    comparisonScore,
  };
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Check if it's a valid file path or relative URL
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }
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
  return REQUIRED_DOCUMENTS[state] || REQUIRED_DOCUMENTS['DEFAULT'] || [];
}
