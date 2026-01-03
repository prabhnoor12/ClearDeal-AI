// Rules Engine Index: Central export for all rules and rule engine functionality
import { BaseRule, RuleEngine, RuleContext, RuleResult, RuleConfig } from './base.rule';
import { createContingencyRules } from './contingency.rules';
import { createDisclosureRules } from './disclosure.rules';
import { createEarnestMoneyRules } from './earnestMoney.rules';
import { createFinancingRules } from './financing.rules';
import { createInspectionRules } from './inspection.rules';
import { createUnusualRules } from './unusual.rules';
import { createStateRules, isStateSupported } from './states';

// ============================================================================
// Rule Categories
// ============================================================================

export interface RuleSet {
  contingency: BaseRule[];
  disclosure: BaseRule[];
  earnestMoney: BaseRule[];
  financing: BaseRule[];
  inspection: BaseRule[];
  unusualClauses: BaseRule[];
  stateSpecific: BaseRule[];
}

// ============================================================================
// Rule Factory
// ============================================================================

/**
 * Create all rules for a given configuration
 */
export function createAllRules(config?: Partial<RuleConfig>, stateCode?: string): RuleSet {
  const stateRules = stateCode && isStateSupported(stateCode)
    ? createStateRules(stateCode, config)
    : [];

  return {
    contingency: createContingencyRules(),
    disclosure: createDisclosureRules(config),
    earnestMoney: createEarnestMoneyRules(config),
    financing: createFinancingRules(config),
    inspection: createInspectionRules(config),
    unusualClauses: createUnusualRules(config),
    stateSpecific: stateRules,
  };
}

/**
 * Create a flat array of all rules
 */
export function createFlatRuleList(config?: Partial<RuleConfig>, stateCode?: string): BaseRule[] {
  const ruleSet = createAllRules(config, stateCode);
  return [
    ...ruleSet.contingency,
    ...ruleSet.disclosure,
    ...ruleSet.earnestMoney,
    ...ruleSet.financing,
    ...ruleSet.inspection,
    ...ruleSet.unusualClauses,
    ...ruleSet.stateSpecific,
  ];
}

// ============================================================================
// Pre-configured Rule Engine
// ============================================================================

/**
 * Create a rule engine with all rules loaded
 */
export function createRuleEngine(config?: Partial<RuleConfig>, stateCode?: string): RuleEngine {
  const engine = new RuleEngine();
  const rules = createFlatRuleList(config, stateCode);
  engine.registerAll(rules);
  return engine;
}

/**
 * Get the highest severity from a rule result's flags
 */
function getMaxSeverity(result: RuleResult): string {
  if (result.flags.length === 0) return 'low';
  
  const severityOrder = ['low', 'medium', 'high', 'critical'] as const;
  let maxIndex = 0;
  
  for (const flag of result.flags) {
    const index = severityOrder.indexOf(flag.severity as typeof severityOrder[number]);
    if (index > maxIndex) maxIndex = index;
  }
  
  return severityOrder[maxIndex] ?? 'low';
}

/**
 * Extract category from rule ID prefix
 */
function getCategoryFromRuleId(ruleId: string): string {
  // Rule IDs follow pattern: CATEGORY_SPECIFIC_NAME
  const parts = ruleId.split('_');
  const firstPart = parts[0];
  if (firstPart) {
    return firstPart.toLowerCase();
  }
  return 'unknown';
}

/**
 * Quick analysis function - creates engine, runs rules, returns results
 */
export async function analyzeContract(
  context: RuleContext,
  config?: Partial<RuleConfig>
): Promise<{
  results: RuleResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    critical: number;
    byCategory: Record<string, { passed: number; failed: number }>;
  };
}> {
  const engine = createRuleEngine(config, context.state);
  const results = engine.evaluate(context);
  
  // Calculate summary
  const passed = results.filter((r: RuleResult) => r.passed).length;
  const failed = results.filter((r: RuleResult) => !r.passed).length;
  const warnings = results.filter((r: RuleResult) => !r.passed && getMaxSeverity(r) === 'medium').length;
  const critical = results.filter((r: RuleResult) => !r.passed && getMaxSeverity(r) === 'critical').length;
  
  // Group by category
  const byCategory: Record<string, { passed: number; failed: number }> = {};
  for (const result of results) {
    const cat = getCategoryFromRuleId(result.ruleId);
    if (!byCategory[cat]) {
      byCategory[cat] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      byCategory[cat].passed++;
    } else {
      byCategory[cat].failed++;
    }
  }
  
  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      warnings,
      critical,
      byCategory,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

// Base classes
export { BaseRule, RuleEngine } from './base.rule';

// Types (using type-only export for isolatedModules compatibility)
export type { RuleContext, RuleResult, RuleConfig, RuleCategory, RuleSeverity } from './base.rule';

// Individual rule creators
export { createContingencyRules, createContingencyRuleEngine } from './contingency.rules';
export { createDisclosureRules } from './disclosure.rules';
export { createEarnestMoneyRules } from './earnestMoney.rules';
export { createFinancingRules } from './financing.rules';
export { createInspectionRules } from './inspection.rules';
export { createUnusualRules } from './unusual.rules';

// State rules
export {
  createStateRules,
  isStateSupported,
  getSupportedStateCodes,
  getStateInfo,
  getStateList,
} from './states';

// State types
export type { SupportedStateCode, StateInfo } from './states';

// Individual rule classes for advanced usage
// Note: contingency.rules exports are included via createContingencyRules
// to avoid naming conflicts with financing/inspection rules
export * from './disclosure.rules';
export * from './earnestMoney.rules';
export * from './financing.rules';
export * from './inspection.rules';
export * from './unusual.rules';
