// Base rule: Abstract foundation for all contract analysis rules
import { RiskFlag } from '../types/risk.types';
import { Contract, Clause, Disclosure, Addendum } from '../types/contract.types';

// Rule severity levels
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

// Rule categories for organization and filtering
export type RuleCategory =
  | 'contingency'
  | 'disclosure'
  | 'financing'
  | 'inspection'
  | 'earnest_money'
  | 'unusual_clause'
  | 'timeline'
  | 'legal'
  | 'state_specific';

// Context passed to rules for evaluation
export interface RuleContext {
  contract: Contract;
  clauses: Clause[];
  disclosures: Disclosure[];
  addenda: Addendum[];
  state?: string;
  contractText?: string;
  metadata?: Record<string, unknown>;
}

// Result of a single rule evaluation
export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  flags: RiskFlag[];
  details?: string;
  suggestions?: string[];
}

// Configuration options for rules
export interface RuleConfig {
  enabled: boolean;
  severity: RuleSeverity;
  customThresholds?: Record<string, number>;
  stateOverrides?: Record<string, Partial<RuleConfig>>;
}

// Default configuration
const DEFAULT_CONFIG: RuleConfig = {
  enabled: true,
  severity: 'medium',
};

/**
 * Abstract base class for all contract analysis rules.
 * Extend this class to create specific rule implementations.
 */
export abstract class BaseRule {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly category: RuleCategory;
  protected config: RuleConfig;

  constructor(
    id: string,
    name: string,
    description: string,
    category: RuleCategory,
    config: Partial<RuleConfig> = {}
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main evaluation method - must be implemented by subclasses
   */
  abstract evaluate(context: RuleContext): RuleResult;

  /**
   * Check if the rule is enabled for the given state
   */
  isEnabled(state?: string): boolean {
    if (!this.config.enabled) return false;

    if (state && this.config.stateOverrides?.[state]) {
      return this.config.stateOverrides[state].enabled ?? this.config.enabled;
    }

    return true;
  }

  /**
   * Get the severity level, accounting for state overrides
   */
  getSeverity(state?: string): RuleSeverity {
    if (state && this.config.stateOverrides?.[state]?.severity) {
      return this.config.stateOverrides[state].severity!;
    }
    return this.config.severity;
  }

  /**
   * Update rule configuration
   */
  configure(config: Partial<RuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a risk flag from this rule's evaluation
   */
  protected createFlag(
    code: string,
    description: string,
    severityOverride?: RuleSeverity
  ): RiskFlag {
    return {
      code: `${this.id}_${code}`,
      description,
      severity: severityOverride ?? this.config.severity,
    };
  }

  /**
   * Create a passing result with no flags
   */
  protected pass(details?: string): RuleResult {
    const result: RuleResult = {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      flags: [],
    };
    if (details !== undefined) {
      result.details = details;
    }
    return result;
  }

  /**
   * Create a failing result with flags
   */
  protected fail(flags: RiskFlag[], details?: string, suggestions?: string[]): RuleResult {
    const result: RuleResult = {
      ruleId: this.id,
      ruleName: this.name,
      passed: false,
      flags,
    };
    if (details !== undefined) {
      result.details = details;
    }
    if (suggestions !== undefined) {
      result.suggestions = suggestions;
    }
    return result;
  }

  /**
   * Search for patterns in contract text
   */
  protected findPatterns(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  /**
   * Check if any of the keywords exist in text (case-insensitive)
   */
  protected containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Extract numeric values from text (e.g., dollar amounts, percentages, days)
   */
  protected extractNumbers(text: string, pattern: RegExp): number[] {
    const matches = text.match(pattern) || [];
    return matches
      .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
      .filter(n => !isNaN(n));
  }
}

/**
 * Rule engine for executing multiple rules against a contract
 */
export class RuleEngine {
  private rules: BaseRule[] = [];

  /**
   * Register a rule with the engine
   */
  register(rule: BaseRule): void {
    this.rules.push(rule);
  }

  /**
   * Register multiple rules at once
   */
  registerAll(rules: BaseRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Execute all enabled rules against the context
   */
  evaluate(context: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      if (rule.isEnabled(context.state)) {
        try {
          const result = rule.evaluate(context);
          results.push(result);
        } catch (error) {
          // Rule execution failed - create an error result
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            passed: false,
            flags: [{
              code: `${rule.id}_ERROR`,
              description: `Rule execution failed: ${error}`,
              severity: 'low',
            }],
            details: `Error executing rule: ${error}`,
          });
        }
      }
    }

    return results;
  }

  /**
   * Execute rules for a specific category only
   */
  evaluateCategory(context: RuleContext, category: RuleCategory): RuleResult[] {
    const categoryRules = this.rules.filter(r => r.category === category);
    const filteredEngine = new RuleEngine();
    filteredEngine.registerAll(categoryRules);
    return filteredEngine.evaluate(context);
  }

  /**
   * Get all registered rules
   */
  getRules(): BaseRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: RuleCategory): BaseRule[] {
    return this.rules.filter(r => r.category === category);
  }

  /**
   * Aggregate all flags from results
   */
  static aggregateFlags(results: RuleResult[]): RiskFlag[] {
    return results.flatMap(r => r.flags);
  }

  /**
   * Calculate pass rate from results
   */
  static calculatePassRate(results: RuleResult[]): number {
    if (results.length === 0) return 100;
    const passed = results.filter(r => r.passed).length;
    return Math.round((passed / results.length) * 100);
  }

  /**
   * Get summary statistics from results
   */
  static summarize(results: RuleResult[]): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    flagsBySeverity: Record<RuleSeverity, number>;
  } {
    const flags = RuleEngine.aggregateFlags(results);

    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: RuleEngine.calculatePassRate(results),
      flagsBySeverity: {
        low: flags.filter(f => f.severity === 'low').length,
        medium: flags.filter(f => f.severity === 'medium').length,
        high: flags.filter(f => f.severity === 'high').length,
        critical: flags.filter(f => f.severity === 'critical').length,
      },
    };
  }
}
