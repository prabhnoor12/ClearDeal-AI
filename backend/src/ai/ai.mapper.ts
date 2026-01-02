// Maps raw AI output to internal types
import { Clause, Disclosure, Addendum } from '../types/contract.types';
import { RiskFlag } from '../types/risk.types';

export function mapClauses(aiOutput: any): Clause[] {
  // Example: map AI output to Clause objects
  if (!Array.isArray(aiOutput)) return [];
  return aiOutput.map((c: any, idx: number) => ({
    id: c.id || `clause-${idx}`,
    contractId: c.contractId || '',
    text: c.text || '',
    type: c.type || 'standard',
    flagged: !!c.flagged,
  }));
}

export function mapDisclosures(aiOutput: any): Disclosure[] {
  if (!Array.isArray(aiOutput)) return [];
  return aiOutput.map((d: any, idx: number) => ({
    id: d.id || `disclosure-${idx}`,
    contractId: d.contractId || '',
    name: d.name || '',
    required: !!d.required,
    provided: !!d.provided,
  }));
}

export function mapAddenda(aiOutput: any): Addendum[] {
  if (!Array.isArray(aiOutput)) return [];
  return aiOutput.map((a: any, idx: number) => ({
    id: a.id || `addendum-${idx}`,
    contractId: a.contractId || '',
    name: a.name || '',
    included: !!a.included,
  }));
}

export function mapRiskFlags(aiOutput: any): RiskFlag[] {
  if (!Array.isArray(aiOutput)) return [];
  return aiOutput.map((f: any, idx: number) => ({
    code: f.code || `flag-${idx}`,
    description: f.description || '',
    severity: f.severity || 'low',
  }));
}

export function mapSummary(aiOutput: any): string {
  // Map AI output to summary string
  return typeof aiOutput === 'string' ? aiOutput.trim() : '';
}

export function mapUnusualClauses(aiOutput: any): Array<{ text: string; reason: string }> {
  if (!Array.isArray(aiOutput)) return [];
  return aiOutput.map((u: any) => ({
    text: u.text || '',
    reason: u.reason || '',
  }));
}
