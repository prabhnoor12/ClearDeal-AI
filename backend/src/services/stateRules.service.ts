// State rules service: applies state-specific rules for contracts
import { RiskFlag } from '../types/risk.types';
import { Contract } from '../types/contract.types';
import * as contractRepository from '../repositories/contract.repository';

// Supported US states
export type SupportedState = 'CA' | 'TX' | 'FL' | 'NY';

interface StateRule {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (contract: Contract) => boolean;
}

// State-specific rule definitions
const STATE_RULES: Record<SupportedState, StateRule[]> = {
  CA: [
    {
      code: 'CA_TDS_MISSING',
      description: 'California Transfer Disclosure Statement (TDS) is required but missing',
      severity: 'critical',
      check: (contract) => !contract.disclosures.some(d => d.name.includes('TDS') && d.provided),
    },
    {
      code: 'CA_NHD_MISSING',
      description: 'Natural Hazard Disclosure (NHD) is required but missing',
      severity: 'high',
      check: (contract) => !contract.disclosures.some(d => d.name.includes('NHD') && d.provided),
    },
    {
      code: 'CA_LEAD_PAINT',
      description: 'Lead-based paint disclosure required for pre-1978 properties',
      severity: 'high',
      check: (contract) => !contract.disclosures.some(d => d.name.toLowerCase().includes('lead') && d.provided),
    },
    {
      code: 'CA_EARTHQUAKE',
      description: 'Earthquake hazards disclosure required in seismic zones',
      severity: 'medium',
      check: (contract) => !contract.disclosures.some(d => d.name.toLowerCase().includes('earthquake') && d.provided),
    },
  ],
  TX: [
    {
      code: 'TX_SELLERS_DISCLOSURE',
      description: 'Texas Seller\'s Disclosure Notice is required but missing',
      severity: 'critical',
      check: (contract) => !contract.disclosures.some(d => d.name.includes('Seller') && d.provided),
    },
    {
      code: 'TX_HOA_ADDENDUM',
      description: 'HOA Addendum required for properties with HOA',
      severity: 'high',
      check: (contract) => !contract.addenda.some(a => a.name.toLowerCase().includes('hoa') && a.included),
    },
    {
      code: 'TX_OPTION_PERIOD',
      description: 'Option period terms should be clearly defined',
      severity: 'medium',
      check: (contract) => !contract.clauses.some(c => c.text.toLowerCase().includes('option period')),
    },
  ],
  FL: [
    {
      code: 'FL_RADON_DISCLOSURE',
      description: 'Florida Radon Gas Disclosure is required',
      severity: 'high',
      check: (contract) => !contract.disclosures.some(d => d.name.toLowerCase().includes('radon') && d.provided),
    },
    {
      code: 'FL_CONDO_RIDER',
      description: 'Condominium Rider required for condo purchases',
      severity: 'medium',
      check: (contract) => !contract.addenda.some(a => a.name.toLowerCase().includes('condo') && a.included),
    },
    {
      code: 'FL_AS_IS_RIDER',
      description: 'As-Is Rider should be reviewed carefully for buyer protection',
      severity: 'medium',
      check: (contract) => contract.clauses.some(c => c.text.toLowerCase().includes('as-is') && !c.flagged),
    },
  ],
  NY: [
    {
      code: 'NY_PROPERTY_CONDITION',
      description: 'New York Property Condition Disclosure Statement required',
      severity: 'critical',
      check: (contract) => !contract.disclosures.some(d => d.name.includes('Property Condition') && d.provided),
    },
    {
      code: 'NY_LEAD_PAINT',
      description: 'Lead paint disclosure required for pre-1978 buildings',
      severity: 'high',
      check: (contract) => !contract.disclosures.some(d => d.name.toLowerCase().includes('lead') && d.provided),
    },
    {
      code: 'NY_ATTORNEY_REVIEW',
      description: 'Attorney review contingency is standard in New York',
      severity: 'medium',
      check: (contract) => !contract.clauses.some(c => c.text.toLowerCase().includes('attorney review')),
    },
  ],
};

export function getSupportedStates(): SupportedState[] {
  return Object.keys(STATE_RULES) as SupportedState[];
}

export function isStateSupported(state: string): state is SupportedState {
  return state in STATE_RULES;
}

export async function applyStateRules(contractId: string, state: string): Promise<RiskFlag[]> {
  if (!isStateSupported(state)) {
    return [{
      code: 'UNSUPPORTED_STATE',
      description: `State ${state} is not yet supported. Manual review recommended.`,
      severity: 'medium',
    }];
  }

  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    return [{
      code: 'CONTRACT_NOT_FOUND',
      description: 'Contract not found for state rule evaluation',
      severity: 'critical',
    }];
  }

  const rules = STATE_RULES[state];
  const violations: RiskFlag[] = [];

  for (const rule of rules) {
    if (rule.check(contract)) {
      violations.push({
        code: rule.code,
        description: rule.description,
        severity: rule.severity,
      });
    }
  }

  return violations;
}

export async function getStateRequirements(state: string): Promise<{ disclosures: string[]; addenda: string[] }> {
  const requirements = {
    CA: {
      disclosures: ['Transfer Disclosure Statement (TDS)', 'Natural Hazard Disclosure (NHD)', 'Lead Paint Disclosure', 'Earthquake Hazards'],
      addenda: ['Statewide Buyer and Seller Advisory', 'Smoke/CO Detector Compliance'],
    },
    TX: {
      disclosures: ['Seller\'s Disclosure Notice', 'Property Tax Information', 'MUD Disclosure'],
      addenda: ['HOA Addendum', 'Third Party Financing Addendum', 'Seller Financing Addendum'],
    },
    FL: {
      disclosures: ['Radon Gas Disclosure', 'Lead Paint Disclosure', 'Property Tax Disclosure'],
      addenda: ['Condominium Rider', 'As-Is Rider', 'Homeowners Association Rider'],
    },
    NY: {
      disclosures: ['Property Condition Disclosure Statement', 'Lead Paint Disclosure', 'Bed Bug Disclosure'],
      addenda: ['Attorney Approval Contingency', 'Mortgage Contingency Rider'],
    },
  };

  return requirements[state as SupportedState] || { disclosures: [], addenda: [] };
}

export async function validateStateCompliance(contractId: string, state: string): Promise<{
  compliant: boolean;
  score: number;
  violations: RiskFlag[];
  requirements: { disclosures: string[]; addenda: string[] };
}> {
  const violations = await applyStateRules(contractId, state);
  const requirements = await getStateRequirements(state);
  
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  
  // Score calculation: start at 100, deduct based on severity
  const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5));
  
  return {
    compliant: violations.length === 0,
    score,
    violations,
    requirements,
  };
}
