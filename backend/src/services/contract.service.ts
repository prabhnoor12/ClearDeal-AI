
import * as contractRepository from '../repositories/contract.repository';
import { Contract, Clause, Disclosure, Addendum } from '../types/contract.types';
import { generatePDF } from '../reports/pdf.generator';
import { Report } from '../reports/report.types';
import { callAI, AIRequest } from '../ai/ai.client';
import { mapClauses, mapUnusualClauses } from '../ai/ai.mapper';
import { parseAIJson, parseAIText } from '../ai/ai.parser';
import { CLAUSE_EXTRACTION_PROMPT } from '../ai/prompts/clauseExtraction.prompt';
import { SUMMARY_PROMPT } from '../ai/prompts/summary.prompt';
import { UNUSUAL_CLAUSE_PROMPT } from '../ai/prompts/unusualClause.prompt';


/**
 * Create a new contract (production-ready)
 */
export async function createContract(data: Partial<Contract> & { uploadedBy: string; organizationId: string }): Promise<Contract> {
  // ID, timestamps, and status should be handled by the database/Prisma
  const contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
    title: data.title || 'Untitled Contract',
    uploadedBy: data.uploadedBy,
    organizationId: data.organizationId,
    status: 'draft',
    documents: data.documents || [],
    clauses: data.clauses || [],
    disclosures: data.disclosures || [],
    addenda: data.addenda || [],
  };
  return contractRepository.create(contract as Contract);
}

/**
 * Get a contract by ID
 */
export async function getContractById(id: string): Promise<Contract | null> {
  return contractRepository.findById(id);
}

/**
 * Update a contract and store previous version
 */
/**
 * Update a contract (production-ready)
 */
export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
  return contractRepository.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}


/**
 * Search contracts by title or status
 */
export async function searchContracts(query: { title?: string; status?: string }): Promise<Contract[]> {
  const all = await getAllContracts();
  return all.filter(c =>
    (!query.title || c.title.toLowerCase().includes(query.title.toLowerCase())) &&
    (!query.status || c.status === query.status)
  );
}

/**
 * Export contract summary as PDF
 */
export async function exportContractSummaryPDF(contractId: string): Promise<string> {
  const contract = await getContractById(contractId);
  if (!contract) throw new Error('Contract not found');
  // Build a report object for PDF generation
  const report: Report = {
    metadata: { 
      reportId: contract.id, 
      createdAt: contract.createdAt,
      contractId: contract.id,
      createdBy: contract.uploadedBy,
      status: contract.status as any
    },
    contract: contract,
    risk: { 
      contractId: contract.id,
      summary: 'No risk analysis performed',
      riskScore: {
        contractId: contract.id,
        score: 0,
        calculatedAt: new Date().toISOString(),
        flags: []
      },
      explanations: []
    },
    score: { 
      contractId: contract.id,
      score: 0,
      calculatedAt: new Date().toISOString(),
      flags: []
    },
    sections: [],
  };
  return generatePDF(report);
}

/**
 * Delete a contract
 */
export async function deleteContract(id: string): Promise<boolean> {
  return contractRepository.deleteById(id);
}

/**
 * Get all contracts
 */
export async function getAllContracts(): Promise<Contract[]> {
  return contractRepository.findAll();
}

/**
 * Extract clauses from contract text using AI
 */
export async function extractClausesFromText(contractId: string, contractText: string): Promise<Clause[]> {
  const prompt = CLAUSE_EXTRACTION_PROMPT.replace('{{contractText}}', contractText);
  const aiRequest: AIRequest = { 
    prompt, 
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.3,
    log: true
  };
  
  const aiResponse = await callAI(aiRequest);
  if (aiResponse.error) {
    throw new Error(`AI clause extraction failed: ${aiResponse.error}`);
  }
  
  const parsed = parseAIJson(aiResponse.raw);
  const clauses = mapClauses(parsed);
  
  // Add contractId to each clause
  return clauses.map(c => ({ ...c, contractId }));
}

/**
 * Generate AI-powered summary of contract
 */
export async function generateContractSummary(contractText: string): Promise<string> {
  const prompt = SUMMARY_PROMPT.replace('{{contractText}}', contractText);
  const aiRequest: AIRequest = { 
    prompt, 
    provider: 'openai',
    maxTokens: 1000,
    temperature: 0.5,
    log: true
  };
  
  const aiResponse = await callAI(aiRequest);
  if (aiResponse.error) {
    throw new Error(`AI summary generation failed: ${aiResponse.error}`);
  }
  
  return parseAIText(aiResponse.raw);
}

/**
 * Detect unusual clauses in contract using AI
 */
export async function detectUnusualClauses(contractText: string): Promise<Array<{ text: string; reason: string }>> {
  const prompt = UNUSUAL_CLAUSE_PROMPT.replace('{{contractText}}', contractText);
  const aiRequest: AIRequest = { 
    prompt, 
    provider: 'openai',
    maxTokens: 1500,
    temperature: 0.4,
    log: true
  };
  
  const aiResponse = await callAI(aiRequest);
  if (aiResponse.error) {
    throw new Error(`AI unusual clause detection failed: ${aiResponse.error}`);
  }
  
  const parsed = parseAIJson(aiResponse.raw);
  return mapUnusualClauses(parsed);
}

/**
 * Perform comprehensive AI analysis on a contract
 */
export async function performAIAnalysis(contractId: string, contractText: string): Promise<{
  clauses: Clause[];
  summary: string;
  unusualClauses: Array<{ text: string; reason: string }>;
}> {
  const contract = await getContractById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  
  // Run AI analyses in parallel for efficiency
  const [clauses, summary, unusualClauses] = await Promise.all([
    extractClausesFromText(contractId, contractText),
    generateContractSummary(contractText),
    detectUnusualClauses(contractText)
  ]);
  
  // Update contract with AI-extracted data
  await updateContract(contractId, {
    clauses,
  });
  
  return {
    clauses,
    summary,
    unusualClauses
  };
}

/**
 * Re-analyze contract with fresh AI analysis
 */
export async function reanalyzeContractWithAI(contractId: string, contractText: string): Promise<Contract | null> {
  const analysis = await performAIAnalysis(contractId, contractText);
  
  return updateContract(contractId, {
    clauses: analysis.clauses,
    status: 'reviewed'
  });
}

/**
 * Analyze a contract and summarize its content
 */
export async function analyzeContract(contractId: string): Promise<{
  clauses: Clause[];
  disclosures: Disclosure[];
  addenda: Addendum[];
  summary: string;
}> {
  const contract = await getContractById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  // In production, return stored clauses, disclosures, addenda, and a summary
  return {
    clauses: contract.clauses,
    disclosures: contract.disclosures,
    addenda: contract.addenda,
    summary: `Contract contains ${contract.clauses.length} clauses, ${contract.disclosures.length} disclosures, ${contract.addenda.length} addenda.`
  };
}

/**
 * Submit a contract (change status)
 */
export async function submitContract(id: string): Promise<Contract | null> {
  return updateContract(id, { status: 'submitted' });
}

/**
 * Archive a contract (change status)
 */
export async function archiveContract(id: string): Promise<Contract | null> {
  return updateContract(id, { status: 'archived' });
}
