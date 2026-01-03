// Financing rules: Validates loan terms, contingencies, and financing conditions
import { BaseRule, RuleContext, RuleResult, RuleConfig, RuleSeverity } from './base.rule';
import { RiskFlag } from '../types/risk.types';

// Industry standard thresholds
const TYPICAL_CONTINGENCY_DAYS_MIN = 17;
const TYPICAL_CONTINGENCY_DAYS_MAX = 30;
const HIGH_LTV_THRESHOLD = 95;

/**
 * Rule: Validate financing contingency presence and terms
 */
export class FinancingContingencyRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FIN_CONTINGENCY',
      'Financing Contingency',
      'Verifies financing contingency is present and properly structured',
      'financing',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for financing contingency
    const contingencyTerms = [
      'financing contingency',
      'loan contingency',
      'mortgage contingency',
      'subject to financing',
      'subject to loan approval',
    ];

    const hasContingency = contingencyTerms.some(term => text.includes(term));

    if (!hasContingency) {
      // Check if it's a cash deal
      if (text.includes('all cash') || text.includes('cash purchase') || text.includes('no financing')) {
        return this.pass('Cash transaction - no financing contingency required');
      }

      flags.push(this.createFlag(
        'MISSING',
        'No financing contingency found - buyer has no protection if loan falls through',
        'critical'
      ));
    }

    // Check for waived contingency
    if (text.includes('waive') && text.includes('financing')) {
      flags.push(this.createFlag(
        'WAIVED',
        'Financing contingency appears to be waived - high buyer risk',
        'critical'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Financing contingency is present');
    }

    return this.fail(flags, 'Financing contingency concerns', [
      'Add or reinstate financing contingency for buyer protection',
      'Ensure buyer has pre-approval before waiving contingency',
    ]);
  }
}

/**
 * Rule: Validate financing contingency timeline
 */
export class FinancingTimelineRule extends BaseRule {
  private readonly minDays: number;
  private readonly maxDays: number;

  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FIN_TIMELINE',
      'Financing Timeline',
      'Checks financing contingency period is reasonable',
      'financing',
      { severity: 'medium', ...config }
    );
    this.minDays = config.customThresholds?.['minDays'] ?? TYPICAL_CONTINGENCY_DAYS_MIN;
    this.maxDays = config.customThresholds?.['maxDays'] ?? TYPICAL_CONTINGENCY_DAYS_MAX;
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const timelinePatterns = [
      /financing\s+contingency[^.]*?(\d+)\s*days?/gi,
      /loan\s+contingency[^.]*?(\d+)\s*days?/gi,
      /(\d+)\s*days?\s*(?:to|for)\s*(?:obtain|secure)\s*(?:financing|loan)/gi,
    ];

    const matches = this.findPatterns(text, timelinePatterns);
    const days = this.extractNumbers(matches.join(' '), /\d+/g);

    if (days.length === 0) {
      return this.pass('No specific financing timeline found to validate');
    }

    for (const dayCount of days) {
      if (dayCount < this.minDays) {
        flags.push(this.createFlag(
          'TOO_SHORT',
          `Financing period of ${dayCount} days is shorter than typical ${this.minDays} days`,
          'high'
        ));
      } else if (dayCount > this.maxDays) {
        flags.push(this.createFlag(
          'TOO_LONG',
          `Financing period of ${dayCount} days exceeds typical ${this.maxDays} days`,
          'low'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('Financing timeline is within acceptable range');
    }

    return this.fail(flags, 'Financing timeline outside typical range', [
      'Standard financing contingency is 17-21 days',
      'Shorter periods may not allow adequate time for loan processing',
    ]);
  }
}

/**
 * Rule: Validate loan terms and conditions
 */
export class LoanTermsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FIN_LOAN_TERMS',
      'Loan Terms Validation',
      'Checks specified loan terms are reasonable',
      'financing',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for high LTV
    const ltvPattern = /(\d+)\s*%?\s*(?:ltv|loan.to.value)/gi;
    const ltvMatches = this.findPatterns(text, [ltvPattern]);
    const ltvValues = this.extractNumbers(ltvMatches.join(' '), /\d+/g);

    for (const ltv of ltvValues) {
      if (ltv > HIGH_LTV_THRESHOLD) {
        flags.push(this.createFlag(
          'HIGH_LTV',
          `LTV of ${ltv}% is very high - may require PMI and stricter approval`,
          'medium'
        ));
      }
    }

    // Check for risky loan types
    const riskyLoanTypes: { pattern: string; severity: RuleSeverity; msg: string }[] = [
      { pattern: 'adjustable rate', severity: 'medium', msg: 'Adjustable rate mortgage carries interest rate risk' },
      { pattern: 'interest only', severity: 'high', msg: 'Interest-only loan does not build equity' },
      { pattern: 'balloon payment', severity: 'high', msg: 'Balloon payment creates future refinance risk' },
      { pattern: 'negative amortization', severity: 'critical', msg: 'Negative amortization increases loan balance over time' },
      { pattern: 'hard money', severity: 'high', msg: 'Hard money loan has high rates and short terms' },
    ];

    for (const { pattern, severity, msg } of riskyLoanTypes) {
      if (text.includes(pattern)) {
        flags.push(this.createFlag('RISKY_LOAN_TYPE', msg, severity));
      }
    }

    if (flags.length === 0) {
      return this.pass('No concerning loan terms detected');
    }

    return this.fail(flags, 'Loan terms require review', [
      'Verify buyer understands loan terms and risks',
      'Consider conventional fixed-rate alternatives',
    ]);
  }
}

/**
 * Rule: Check for pre-approval documentation
 */
export class PreApprovalRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FIN_PREAPPROVAL',
      'Pre-Approval Verification',
      'Checks for pre-approval or pre-qualification references',
      'financing',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';

    // Check if cash transaction
    if (text.includes('all cash') || text.includes('cash purchase')) {
      return this.pass('Cash transaction - pre-approval not applicable');
    }

    const preApprovalTerms = ['pre-approval', 'preapproval', 'pre-approved', 'preapproved'];
    const preQualTerms = ['pre-qualification', 'prequalification', 'pre-qualified', 'prequalified'];

    const hasPreApproval = preApprovalTerms.some(term => text.includes(term));
    const hasPreQual = preQualTerms.some(term => text.includes(term));

    if (hasPreApproval) {
      return this.pass('Pre-approval referenced in contract');
    }

    if (hasPreQual) {
      return this.fail(
        [this.createFlag('PREQUAL_ONLY', 'Only pre-qualification mentioned - pre-approval is stronger', 'low')],
        'Pre-qualification found but not pre-approval'
      );
    }

    return this.fail(
      [this.createFlag('NO_PREAPPROVAL', 'No pre-approval documentation referenced', 'medium')],
      'Pre-approval status not verified',
      ['Request buyer\'s pre-approval letter', 'Verify pre-approval is current and sufficient for purchase price']
    );
  }
}

/**
 * Rule: Validate appraisal contingency
 */
export class AppraisalContingencyRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FIN_APPRAISAL',
      'Appraisal Contingency',
      'Verifies appraisal contingency for financed purchases',
      'financing',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';

    // Cash transactions don't need appraisal contingency
    if (text.includes('all cash') || text.includes('cash purchase')) {
      return this.pass('Cash transaction - appraisal contingency optional');
    }

    const hasAppraisalContingency = text.includes('appraisal contingency') || 
      (text.includes('appraisal') && text.includes('contingent'));

    if (!hasAppraisalContingency) {
      // Check if waived
      if (text.includes('waive') && text.includes('appraisal')) {
        return this.fail(
          [this.createFlag('WAIVED', 'Appraisal contingency waived - buyer at risk if property undervalues', 'high')],
          'Appraisal contingency waived'
        );
      }

      return this.fail(
        [this.createFlag('MISSING', 'No appraisal contingency found for financed purchase', 'high')],
        'Appraisal contingency not specified',
        ['Add appraisal contingency to protect against low appraisal']
      );
    }

    return this.pass('Appraisal contingency is present');
  }
}

// Factory function to create all financing rules
export function createFinancingRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new FinancingContingencyRule(config),
    new FinancingTimelineRule(config),
    new LoanTermsRule(config),
    new PreApprovalRule(config),
    new AppraisalContingencyRule(config),
  ];
}
