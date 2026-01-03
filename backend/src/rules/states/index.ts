// State-specific rules index: Exports all state rules and provides unified access
import { BaseRule, RuleConfig } from '../base.rule';
import { createCaliforniaRules } from './ca.rules';
import { createFloridaRules } from './fl.rules';
import { createNewYorkRules } from './ny.rules';
import { createTexasRules } from './tx.rules';

// Supported state codes
export type SupportedStateCode = 'CA' | 'FL' | 'NY' | 'TX';

// State metadata
export interface StateInfo {
  code: SupportedStateCode;
  name: string;
  createRules: (config?: Partial<RuleConfig>) => BaseRule[];
}

// Registry of all supported states
const STATE_REGISTRY: Record<SupportedStateCode, StateInfo> = {
  CA: { code: 'CA', name: 'California', createRules: createCaliforniaRules },
  FL: { code: 'FL', name: 'Florida', createRules: createFloridaRules },
  NY: { code: 'NY', name: 'New York', createRules: createNewYorkRules },
  TX: { code: 'TX', name: 'Texas', createRules: createTexasRules },
};

/**
 * Check if a state code is supported
 */
export function isStateSupported(stateCode: string): stateCode is SupportedStateCode {
  return stateCode.toUpperCase() in STATE_REGISTRY;
}

/**
 * Get list of all supported state codes
 */
export function getSupportedStateCodes(): SupportedStateCode[] {
  return Object.keys(STATE_REGISTRY) as SupportedStateCode[];
}

/**
 * Get state information by code
 */
export function getStateInfo(stateCode: string): StateInfo | null {
  const code = stateCode.toUpperCase();
  if (!isStateSupported(code)) return null;
  return STATE_REGISTRY[code];
}

/**
 * Get all state names with their codes
 */
export function getStateList(): Array<{ code: SupportedStateCode; name: string }> {
  return Object.values(STATE_REGISTRY).map(({ code, name }) => ({ code, name }));
}

/**
 * Create rules for a specific state
 */
export function createStateRules(stateCode: string, config?: Partial<RuleConfig>): BaseRule[] {
  const stateInfo = getStateInfo(stateCode);
  if (!stateInfo) return [];
  return stateInfo.createRules(config);
}

/**
 * Create rules for multiple states
 */
export function createMultiStateRules(
  stateCodes: string[],
  config?: Partial<RuleConfig>
): Map<SupportedStateCode, BaseRule[]> {
  const rulesMap = new Map<SupportedStateCode, BaseRule[]>();
  
  for (const code of stateCodes) {
    if (isStateSupported(code)) {
      rulesMap.set(code, createStateRules(code, config));
    }
  }
  
  return rulesMap;
}

// Re-export rule classes (not the STATE_CODE/STATE_NAME constants to avoid conflicts)
export {
  CaliforniaTDSRule,
  CaliforniaNHDRule,
  CaliforniaMelloRoosRule,
  CaliforniaEarthquakeRule,
  CaliforniaDetectorRule,
  createCaliforniaRules,
} from './ca.rules';

export {
  FloridaSellerDisclosureRule,
  FloridaFloodZoneRule,
  FloridaHOADisclosureRule,
  FloridaRadonRule,
  FloridaEnergyDisclosureRule,
  FloridaWindMitigationRule,
  createFloridaRules,
} from './fl.rules';

export {
  NewYorkPCDSRule,
  NewYorkLeadPaintRule,
  NewYorkAttorneyReviewRule,
  NewYorkBoardApprovalRule,
  NewYorkMansionTaxRule,
  NewYorkDetectorRule,
  createNewYorkRules,
} from './ny.rules';

export {
  TexasSellerDisclosureRule,
  TexasOptionPeriodRule,
  TexasMUDDisclosureRule,
  TexasHOARule,
  TexasSurveyRule,
  TexasTitleRule,
  createTexasRules,
} from './tx.rules';
