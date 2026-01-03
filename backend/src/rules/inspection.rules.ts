// Inspection rules: Validates inspection contingencies, timelines, and requirements
import { BaseRule, RuleContext, RuleResult, RuleConfig, RuleSeverity } from './base.rule';
import { RiskFlag } from '../types/risk.types';

// Industry standard thresholds
const TYPICAL_INSPECTION_DAYS_MIN = 7;
const TYPICAL_INSPECTION_DAYS_MAX = 17;

/**
 * Rule: Validate inspection contingency presence
 */
export class InspectionContingencyRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'INSP_CONTINGENCY',
      'Inspection Contingency',
      'Verifies inspection contingency is present and properly structured',
      'inspection',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const contingencyTerms = [
      'inspection contingency',
      'physical inspection',
      'buyer\'s inspection',
      'property inspection contingency',
      'subject to inspection',
    ];

    const hasContingency = contingencyTerms.some(term => text.includes(term));

    if (!hasContingency) {
      // Check for "as-is" sale
      if (text.includes('as-is') || text.includes('as is')) {
        flags.push(this.createFlag(
          'AS_IS',
          'Property sold "as-is" - buyer assumes all condition risks',
          'high'
        ));
      } else {
        flags.push(this.createFlag(
          'MISSING',
          'No inspection contingency found - buyer cannot back out due to inspection issues',
          'critical'
        ));
      }
    }

    // Check for waived contingency
    if (text.includes('waive') && text.includes('inspection')) {
      flags.push(this.createFlag(
        'WAIVED',
        'Inspection contingency appears to be waived',
        'critical'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Inspection contingency is present');
    }

    return this.fail(flags, 'Inspection contingency concerns', [
      'Add inspection contingency for buyer protection',
      'Consider pre-inspection before waiving contingency',
    ]);
  }
}

/**
 * Rule: Validate inspection timeline
 */
export class InspectionTimelineRule extends BaseRule {
  private readonly minDays: number;
  private readonly maxDays: number;

  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'INSP_TIMELINE',
      'Inspection Timeline',
      'Checks inspection period is reasonable',
      'inspection',
      { severity: 'medium', ...config }
    );
    this.minDays = config.customThresholds?.['minDays'] ?? TYPICAL_INSPECTION_DAYS_MIN;
    this.maxDays = config.customThresholds?.['maxDays'] ?? TYPICAL_INSPECTION_DAYS_MAX;
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const timelinePatterns = [
      /inspection[^.]*?(\d+)\s*(?:calendar\s*)?days?/gi,
      /(\d+)\s*(?:calendar\s*)?days?\s*(?:for|to)\s*(?:complete\s*)?inspection/gi,
      /inspection\s*period[^.]*?(\d+)\s*days?/gi,
    ];

    const matches = this.findPatterns(text, timelinePatterns);
    const days = this.extractNumbers(matches.join(' '), /\d+/g);

    if (days.length === 0) {
      return this.fail(
        [this.createFlag('NO_TIMELINE', 'Inspection timeline not specified', 'medium')],
        'No inspection deadline found'
      );
    }

    for (const dayCount of days) {
      if (dayCount < this.minDays) {
        flags.push(this.createFlag(
          'TOO_SHORT',
          `Inspection period of ${dayCount} days may not allow thorough inspection`,
          'high'
        ));
      } else if (dayCount > this.maxDays) {
        flags.push(this.createFlag(
          'TOO_LONG',
          `Inspection period of ${dayCount} days exceeds typical ${this.maxDays} days`,
          'low'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass(`Inspection timeline of ${days[0]} days is reasonable`);
    }

    return this.fail(flags, 'Inspection timeline outside typical range', [
      'Standard inspection period is 10-17 days',
      'Ensure adequate time for scheduling and reviewing reports',
    ]);
  }
}

/**
 * Rule: Check for required inspection types
 */
export class RequiredInspectionsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'INSP_REQUIRED_TYPES',
      'Required Inspection Types',
      'Verifies essential inspections are included',
      'inspection',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];
    const foundInspections: string[] = [];

    // Check for general home inspection
    if (!text.includes('home inspection') && !text.includes('general inspection')) {
      flags.push(this.createFlag(
        'NO_HOME_INSPECTION',
        'General home inspection not specifically mentioned',
        'medium'
      ));
    } else {
      foundInspections.push('home inspection');
    }

    // Check for pest inspection
    if (!text.includes('pest') && !text.includes('termite') && !text.includes('wood destroying')) {
      flags.push(this.createFlag(
        'NO_PEST_INSPECTION',
        'Pest/termite inspection not mentioned',
        'medium'
      ));
    } else {
      foundInspections.push('pest inspection');
    }

    if (flags.length === 0) {
      return this.pass(`Essential inspections referenced: ${foundInspections.join(', ')}`);
    }

    return this.fail(flags, 'Some standard inspections not specified', [
      'Consider including home inspection and pest inspection',
      'Add specialized inspections based on property age and type',
    ]);
  }
}

/**
 * Rule: Check inspection repair/credit terms
 */
export class InspectionRepairTermsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'INSP_REPAIR_TERMS',
      'Inspection Repair Terms',
      'Validates repair request and credit terms',
      'inspection',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for repair cap
    const repairCapPatterns = [
      /repair[s]?\s+(?:cap|limit|maximum)[^.]*?\$?([\d,]+)/gi,
      /\$?([\d,]+)\s+(?:repair\s+)?(?:cap|limit|maximum)/gi,
    ];
    const repairMatches = this.findPatterns(text, repairCapPatterns);

    if (repairMatches.length === 0 && !text.includes('as-is') && !text.includes('as is')) {
      flags.push(this.createFlag(
        'NO_REPAIR_CAP',
        'No repair cap or limit specified',
        'low'
      ));
    }

    // Check for problematic repair terms
    const riskyTerms: { pattern: string; severity: RuleSeverity; msg: string }[] = [
      { pattern: 'seller not responsible', severity: 'high', msg: 'Seller disclaims repair responsibility' },
      { pattern: 'buyer accepts', severity: 'medium', msg: 'Buyer acceptance language may limit recourse' },
      { pattern: 'no repairs', severity: 'high', msg: 'Contract prohibits repair requests' },
    ];

    for (const { pattern, severity, msg } of riskyTerms) {
      if (text.includes(pattern)) {
        flags.push(this.createFlag('RISKY_REPAIR_TERMS', msg, severity));
      }
    }

    // Check for credit option
    if (text.includes('credit') && (text.includes('repair') || text.includes('closing'))) {
      // Credit option exists - generally good
    } else if (!text.includes('as-is')) {
      flags.push(this.createFlag(
        'NO_CREDIT_OPTION',
        'No repair credit option mentioned',
        'low'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Repair and credit terms are defined');
    }

    return this.fail(flags, 'Repair terms need clarification', [
      'Define repair cap and credit options',
      'Specify process for repair negotiations',
    ]);
  }
}

// Factory function to create all inspection rules
export function createInspectionRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new InspectionContingencyRule(config),
    new InspectionTimelineRule(config),
    new RequiredInspectionsRule(config),
    new InspectionRepairTermsRule(config),
  ];
}
