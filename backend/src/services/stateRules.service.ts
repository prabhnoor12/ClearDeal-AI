// State rules service: applies state-specific rules for contracts
// Integrates with the rules engine for comprehensive state-specific validation
import { RiskFlag } from '../types/risk.types';
import * as contractRepository from '../repositories/contract.repository';
import {
  createStateRules,
  isStateSupported as rulesIsStateSupported,
  getSupportedStateCodes,
  getStateInfo,
  getStateList,
  RuleEngine,
  RuleContext,
} from '../rules';
import type { SupportedStateCode } from '../rules';

// ============================================================================
// Types
// ============================================================================

// Re-export for backward compatibility
export type SupportedState = SupportedStateCode;

// State requirements for disclosures and addenda
export interface StateRequirements {
  disclosures: string[];
  addenda: string[];
}

// State compliance result
export interface StateComplianceResult {
  compliant: boolean;
  score: number;
  violations: RiskFlag[];
  requirements: StateRequirements;
}

// ============================================================================
// State Requirements Registry
// ============================================================================

const STATE_REQUIREMENTS: Record<SupportedState, StateRequirements> = {
  CA: {
    disclosures: [
      'Transfer Disclosure Statement (TDS)',
      'Natural Hazard Disclosure (NHD)',
      'Lead Paint Disclosure',
      'Earthquake Hazards Disclosure',
      'Mello-Roos Disclosure',
    ],
    addenda: [
      'Statewide Buyer and Seller Advisory',
      'Smoke/CO Detector Compliance',
      'Water Heater and Smoke Detector Statement',
    ],
  },
  TX: {
    disclosures: [
      "Seller's Disclosure Notice",
      'Property Tax Information',
      'MUD Disclosure (if applicable)',
      'HOA Information',
    ],
    addenda: [
      'Third Party Financing Addendum',
      'Seller Financing Addendum',
      'HOA Addendum (if applicable)',
    ],
  },
  FL: {
    disclosures: [
      'Radon Gas Disclosure',
      "Seller's Property Disclosure",
      'Lead Paint Disclosure',
      'Property Tax Disclosure',
      'Energy Efficiency Rating',
    ],
    addenda: [
      'Condominium Rider',
      'As-Is Rider',
      'Homeowners Association Rider',
      'Wind Mitigation Inspection',
    ],
  },
  NY: {
    disclosures: [
      'Property Condition Disclosure Statement',
      'Lead Paint Disclosure',
      'Bed Bug Disclosure',
    ],
    addenda: [
      'Attorney Approval Contingency',
      'Mortgage Contingency Rider',
      'Board Approval Rider (for co-ops/condos)',
    ],
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get list of all supported states
 */
export function getSupportedStates(): SupportedState[] {
  return getSupportedStateCodes();
}

/**
 * Check if a state code is supported
 */
export function isStateSupported(state: string): state is SupportedState {
  return rulesIsStateSupported(state);
}

/**
 * Get human-readable state name
 */
export function getStateName(state: string): string | null {
  const info = getStateInfo(state);
  return info ? info.name : null;
}

/**
 * Get list of states with their codes and names
 */
export function getAvailableStates(): Array<{ code: SupportedState; name: string }> {
  return getStateList();
}

/**
 * Apply state-specific rules to a contract
 */
export async function applyStateRules(contractId: string, state: string): Promise<RiskFlag[]> {
  // Validate state is supported
  if (!isStateSupported(state)) {
    return [{
      code: 'UNSUPPORTED_STATE',
      description: `State ${state} is not yet supported. Manual review recommended.`,
      severity: 'medium',
    }];
  }

  // Fetch contract
  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    return [{
      code: 'CONTRACT_NOT_FOUND',
      description: 'Contract not found for state rule evaluation',
      severity: 'critical',
    }];
  }

  // Create rule engine with state-specific rules
  const rules = createStateRules(state);
  const engine = new RuleEngine();
  engine.registerAll(rules);

  // Build rule context
  const context: RuleContext = {
    contract,
    clauses: contract.clauses,
    disclosures: contract.disclosures,
    addenda: contract.addenda,
    state,
  };

  // Execute rules
  const results = engine.evaluate(context);

  // Extract flags from failed rules
  const violations: RiskFlag[] = [];
  for (const result of results) {
    if (!result.passed) {
      violations.push(...result.flags);
    }
  }

  return violations;
}

/**
 * Get required disclosures and addenda for a state
 */
export async function getStateRequirements(state: string): Promise<StateRequirements> {
  if (!isStateSupported(state)) {
    return { disclosures: [], addenda: [] };
  }
  
  return STATE_REQUIREMENTS[state];
}

/**
 * Validate full state compliance for a contract
 */
export async function validateStateCompliance(
  contractId: string,
  state: string
): Promise<StateComplianceResult> {
  // Get violations and requirements
  const violations = await applyStateRules(contractId, state);
  const requirements = await getStateRequirements(state);
  
  // Count by severity
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  const lowCount = violations.filter(v => v.severity === 'low').length;
  
  // Score calculation: start at 100, deduct based on severity
  // Critical: -25, High: -15, Medium: -5, Low: -2
  const score = Math.max(0, 100 
    - (criticalCount * 25) 
    - (highCount * 15) 
    - (mediumCount * 5) 
    - (lowCount * 2)
  );
  
  return {
    compliant: violations.length === 0,
    score,
    violations,
    requirements,
  };
}

/**
 * Get detailed state compliance report
 */
export async function getStateComplianceReport(
  contractId: string,
  state: string
): Promise<{
  state: { code: string; name: string } | null;
  compliance: StateComplianceResult;
  rulesSummary: {
    total: number;
    passed: number;
    failed: number;
  };
}> {
  // Validate state
  if (!isStateSupported(state)) {
    return {
      state: null,
      compliance: {
        compliant: false,
        score: 0,
        violations: [{
          code: 'UNSUPPORTED_STATE',
          description: `State ${state} is not supported`,
          severity: 'medium',
        }],
        requirements: { disclosures: [], addenda: [] },
      },
      rulesSummary: { total: 0, passed: 0, failed: 0 },
    };
  }

  // Get compliance data
  const compliance = await validateStateCompliance(contractId, state);
  
  // Get rules for summary
  const rules = createStateRules(state);
  const failedCount = compliance.violations.length;
  const totalCount = rules.length;
  
  return {
    state: {
      code: state,
      name: getStateName(state) || state,
    },
    compliance,
    rulesSummary: {
      total: totalCount,
      passed: totalCount - failedCount,
      failed: failedCount,
    },
  };
}
