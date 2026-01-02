// Contract service: orchestrates contract business logic
import * as contractRepository from '../repositories/contract.repository';

import { Contract, Clause, Disclosure, Addendum } from '../types/contract.types';
import { callAI, AIRequest } from '../ai/ai.client';
import { mapClauses } from '../ai/ai.mapper';
import { parseAIJson } from '../ai/ai.parser';
import { CLAUSE_EXTRACTION_PROMPT } from '../ai/prompts/clauseExtraction.prompt';

export async function createContract(data: Partial<Contract> & { uploadedBy: string; organizationId: string }): Promise<Contract> {
  const contract: Contract = {
    id: `contract_${Date.now()}`,
    title: data.title || 'Untitled Contract',
    uploadedBy: data.uploadedBy,
    organizationId: data.organizationId,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documents: data.documents || [],
    clauses: data.clauses || [],
    disclosures: data.disclosures || [],
    addenda: data.addenda || [],
  };

  return contractRepository.create(contract);
}

export async function getContractById(id: string): Promise<Contract | null> {
  return contractRepository.findById(id);
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
  const updated = await contractRepository.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function deleteContract(id: string): Promise<boolean> {
  return contractRepository.deleteById(id);
}

export async function getAllContracts(): Promise<Contract[]> {
  return contractRepository.findAll();
}

export async function extractClausesFromText(contractId: string, contractText: string): Promise<Clause[]> {
  const prompt = CLAUSE_EXTRACTION_PROMPT.replace('{{contractText}}', contractText);
  const aiRequest: AIRequest = {
    prompt,
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.2,
  };

  const response = await callAI(aiRequest);
  const parsed = parseAIJson(response.raw);
  const clauses = mapClauses(parsed?.clauses || []);

  // Attach contractId to each clause
  return clauses.map(c => ({ ...c, contractId }));
}

export async function analyzeContract(contractId: string): Promise<{
  clauses: Clause[];
  disclosures: Disclosure[];
  addenda: Addendum[];
  summary: string;
}> {
  const contract = await getContractById(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);

  // Get document text (mock for now)
  const contractText = contract.documents.map(d => `Document: ${d.url}`).join('\n');

  const clauses = await extractClausesFromText(contractId, contractText);

  return {
    clauses,
    disclosures: contract.disclosures,
    addenda: contract.addenda,
    summary: `Analyzed ${clauses.length} clauses, ${contract.disclosures.length} disclosures, ${contract.addenda.length} addenda.`,
  };
}

export async function submitContract(id: string): Promise<Contract | null> {
  return updateContract(id, { status: 'submitted' });
}

export async function archiveContract(id: string): Promise<Contract | null> {
  return updateContract(id, { status: 'archived' });
}
