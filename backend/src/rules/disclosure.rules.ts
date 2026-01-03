// Disclosure rules: Validates required disclosures are present and complete
import { BaseRule, RuleContext, RuleResult, RuleConfig } from './base.rule';
import { RiskFlag } from '../types/risk.types';

// Required disclosures by category
const STANDARD_DISCLOSURES = [
  'Transfer Disclosure Statement (TDS)',
  'Natural Hazard Disclosure (NHD)',
  'Lead-Based Paint Disclosure',
  'Preliminary Title Report',
];

const PROPERTY_CONDITION_DISCLOSURES = [
  'Property Condition Report',
  'Pest Inspection Report',
  'Roof Inspection',
  'Foundation Report',
];

const FINANCIAL_DISCLOSURES = [
  'HOA Documents',
  'CC&Rs',
  'HOA Financial Statements',
  'Special Assessments',
];

/**
 * Rule: Check for missing required disclosures
 */
export class MissingDisclosuresRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'DISCLOSURE_MISSING',
      'Missing Required Disclosures',
      'Checks that all required disclosures have been provided',
      'disclosure',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const { disclosures } = context;
    const flags: RiskFlag[] = [];
    const missing: string[] = [];

    for (const disclosure of disclosures) {
      if (disclosure.required && !disclosure.provided) {
        missing.push(disclosure.name);
        flags.push(this.createFlag(
          'MISSING',
          `Required disclosure not provided: ${disclosure.name}`,
          this.getSeverityForDisclosure(disclosure.name)
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('All required disclosures provided');
    }

    return this.fail(
      flags,
      `${missing.length} required disclosure(s) missing`,
      missing.map(name => `Obtain and attach: ${name}`)
    );
  }

  private getSeverityForDisclosure(name: string): 'low' | 'medium' | 'high' | 'critical' {
    if (STANDARD_DISCLOSURES.some(d => name.includes(d) || d.includes(name))) {
      return 'critical';
    }
    if (PROPERTY_CONDITION_DISCLOSURES.some(d => name.includes(d))) {
      return 'high';
    }
    return 'medium';
  }
}

/**
 * Rule: Check disclosure completeness
 */
export class DisclosureCompletenessRule extends BaseRule {
  private readonly requiredDisclosures: string[];

  constructor(requiredDisclosures: string[] = STANDARD_DISCLOSURES, config: Partial<RuleConfig> = {}) {
    super(
      'DISCLOSURE_COMPLETENESS',
      'Disclosure Completeness Check',
      'Verifies all standard disclosures are included',
      'disclosure',
      { severity: 'high', ...config }
    );
    this.requiredDisclosures = requiredDisclosures;
  }

  evaluate(context: RuleContext): RuleResult {
    const providedNames = context.disclosures
      .filter(d => d.provided)
      .map(d => d.name.toLowerCase());

    const flags: RiskFlag[] = [];
    const missingStandard: string[] = [];

    for (const required of this.requiredDisclosures) {
      const found = providedNames.some(name => 
        name.includes(required.toLowerCase()) || required.toLowerCase().includes(name)
      );
      
      if (!found) {
        missingStandard.push(required);
        flags.push(this.createFlag('STANDARD_MISSING', `Standard disclosure missing: ${required}`));
      }
    }

    if (flags.length === 0) {
      return this.pass('All standard disclosures present');
    }

    return this.fail(
      flags,
      `${missingStandard.length} standard disclosure(s) not found`,
      ['Review disclosure requirements for this transaction type']
    );
  }
}

/**
 * Rule: Check for HOA-related disclosures when applicable
 */
export class HOADisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'DISCLOSURE_HOA',
      'HOA Disclosure Requirements',
      'Validates HOA disclosures when property is in an HOA',
      'disclosure',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const contractText = context.contractText?.toLowerCase() || '';
    const hasHOA = this.detectHOA(contractText, context);

    if (!hasHOA) {
      return this.pass('Property not in HOA or HOA not detected');
    }

    const flags: RiskFlag[] = [];
    const providedNames = context.disclosures.filter(d => d.provided).map(d => d.name.toLowerCase());

    for (const required of FINANCIAL_DISCLOSURES) {
      if (!providedNames.some(name => name.includes(required.toLowerCase()))) {
        flags.push(this.createFlag('HOA_MISSING', `HOA disclosure missing: ${required}`));
      }
    }

    if (flags.length === 0) {
      return this.pass('All HOA disclosures provided');
    }

    return this.fail(flags, 'Missing HOA-related disclosures', [
      'Request HOA documents from seller or HOA management',
      'Review CC&Rs for restrictions affecting buyer',
    ]);
  }

  private detectHOA(text: string, context: RuleContext): boolean {
    const hoaKeywords = ['hoa', 'homeowners association', 'association dues', 'hoa fees', 'cc&r'];
    const hasKeyword = hoaKeywords.some(kw => text.includes(kw));
    const hasHOADisclosure = context.disclosures.some(d => 
      d.name.toLowerCase().includes('hoa') || d.name.toLowerCase().includes('association')
    );
    return hasKeyword || hasHOADisclosure;
  }
}

/**
 * Rule: Check for property condition disclosure age
 */
export class DisclosureAgeRule extends BaseRule {
  private readonly maxAgeDays: number;

  constructor(maxAgeDays: number = 180, config: Partial<RuleConfig> = {}) {
    super(
      'DISCLOSURE_AGE',
      'Disclosure Age Check',
      'Flags disclosures that may be outdated',
      'disclosure',
      { severity: 'medium', ...config }
    );
    this.maxAgeDays = maxAgeDays;
  }

  evaluate(context: RuleContext): RuleResult {
    // Check contract text for dated disclosures
    const datePatterns = [
      /dated?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /as of\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    ];

    const contractText = context.contractText || '';
    const dates = this.findPatterns(contractText, datePatterns);

    if (dates.length === 0) {
      return this.pass('No dated disclosures found to validate');
    }

    const flags: RiskFlag[] = [];
    const now = new Date();

    for (const dateStr of dates) {
      const parsedDate = this.parseDate(dateStr);
      if (parsedDate) {
        const ageDays = Math.floor((now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays > this.maxAgeDays) {
          flags.push(this.createFlag(
            'OUTDATED',
            `Disclosure dated ${dateStr} is ${ageDays} days old (limit: ${this.maxAgeDays})`,
            ageDays > 365 ? 'high' : 'medium'
          ));
        }
      }
    }

    if (flags.length === 0) {
      return this.pass('All dated disclosures within acceptable age');
    }

    return this.fail(flags, 'Some disclosures may be outdated', [
      'Request updated disclosures from seller',
      'Verify current property conditions',
    ]);
  }

  private parseDate(dateStr: string): Date | null {
    const cleaned = dateStr.replace(/dated?\s*:?\s*/i, '').replace(/as of\s*/i, '').trim();
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}

// Factory function to create all disclosure rules
export function createDisclosureRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new MissingDisclosuresRule(config),
    new DisclosureCompletenessRule(STANDARD_DISCLOSURES, config),
    new HOADisclosureRule(config),
    new DisclosureAgeRule(180, config),
  ];
}
