// Earnest money rules: Validates deposit amounts, timelines, and escrow terms
import { BaseRule, RuleContext, RuleResult, RuleConfig, RuleSeverity } from './base.rule';
import { RiskFlag } from '../types/risk.types';

// Industry standard thresholds
const TYPICAL_EMD_PERCENT_MIN = 1;
const TYPICAL_EMD_PERCENT_MAX = 3;
const MAX_DEPOSIT_DAYS = 7;

// Patterns for extracting earnest money details
const EMD_AMOUNT_PATTERNS = [
  /earnest\s*money[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
  /deposit[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
  /emd[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
];

const PURCHASE_PRICE_PATTERNS = [
  /purchase\s*price[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
  /sale\s*price[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
  /total\s*price[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
];

/**
 * Rule: Validate earnest money deposit amount
 */
export class EarnestMoneyAmountRule extends BaseRule {
  private readonly minPercent: number;
  private readonly maxPercent: number;

  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'EMD_AMOUNT',
      'Earnest Money Amount',
      'Validates earnest money deposit is within typical range',
      'earnest_money',
      { severity: 'medium', ...config }
    );
    this.minPercent = config.customThresholds?.['minPercent'] ?? TYPICAL_EMD_PERCENT_MIN;
    this.maxPercent = config.customThresholds?.['maxPercent'] ?? TYPICAL_EMD_PERCENT_MAX;
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText || '';
    const emdAmount = this.extractAmount(text, EMD_AMOUNT_PATTERNS);
    const purchasePrice = this.extractAmount(text, PURCHASE_PRICE_PATTERNS);

    if (!emdAmount) {
      return this.fail(
        [this.createFlag('NOT_FOUND', 'Earnest money deposit amount not found in contract')],
        'Unable to locate EMD amount'
      );
    }

    if (!purchasePrice) {
      return this.pass('EMD found but purchase price not detected for percentage calculation');
    }

    const percentage = (emdAmount / purchasePrice) * 100;
    const flags: RiskFlag[] = [];

    if (percentage < this.minPercent) {
      flags.push(this.createFlag(
        'TOO_LOW',
        `EMD of $${emdAmount.toLocaleString()} is ${percentage.toFixed(2)}% (below typical ${this.minPercent}%)`,
        'medium'
      ));
    } else if (percentage > this.maxPercent) {
      flags.push(this.createFlag(
        'TOO_HIGH',
        `EMD of $${emdAmount.toLocaleString()} is ${percentage.toFixed(2)}% (above typical ${this.maxPercent}%)`,
        'high'
      ));
    }

    if (flags.length === 0) {
      return this.pass(`EMD of $${emdAmount.toLocaleString()} (${percentage.toFixed(2)}%) is within normal range`);
    }

    return this.fail(flags, 'EMD amount outside typical range', [
      percentage < this.minPercent
        ? 'Consider increasing deposit to show stronger commitment'
        : 'Verify buyer is comfortable with higher deposit risk',
    ]);
  }

  private extractAmount(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match?.[1]) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
      pattern.lastIndex = 0; // Reset regex state
    }
    return null;
  }
}

/**
 * Rule: Validate earnest money deposit timeline
 */
export class EarnestMoneyTimelineRule extends BaseRule {
  private readonly maxDays: number;

  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'EMD_TIMELINE',
      'Earnest Money Deposit Timeline',
      'Checks that deposit timeline is reasonable',
      'earnest_money',
      { severity: 'medium', ...config }
    );
    this.maxDays = config.customThresholds?.['maxDays'] ?? MAX_DEPOSIT_DAYS;
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const timelinePatterns = [
      /deposit\s+within\s+(\d+)\s*(business\s*)?(days?)/gi,
      /(\d+)\s*(business\s*)?(days?)\s+to\s+deposit/gi,
      /emd\s+due\s+within\s+(\d+)\s*(business\s*)?(days?)/gi,
    ];

    const matches = this.findPatterns(text, timelinePatterns);
    
    if (matches.length === 0) {
      return this.fail(
        [this.createFlag('TIMELINE_MISSING', 'EMD deposit timeline not specified', 'medium')],
        'No deposit deadline found'
      );
    }

    const days = this.extractNumbers(matches.join(' '), /\d+/g);
    const flags: RiskFlag[] = [];

    for (const dayCount of days) {
      if (dayCount > this.maxDays) {
        flags.push(this.createFlag(
          'TIMELINE_LONG',
          `Deposit timeline of ${dayCount} days exceeds typical ${this.maxDays} days`,
          'medium'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('Deposit timeline is within acceptable range');
    }

    return this.fail(flags, 'Extended deposit timeline detected', [
      'Long timelines may indicate buyer uncertainty',
      'Consider negotiating shorter deposit deadline',
    ]);
  }
}

/**
 * Rule: Validate escrow holder terms
 */
export class EscrowHolderRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'EMD_ESCROW',
      'Escrow Holder Verification',
      'Verifies escrow holder is properly identified',
      'earnest_money',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for escrow holder identification
    const escrowTerms = ['escrow holder', 'escrow agent', 'title company', 'escrow company'];
    const hasEscrowHolder = escrowTerms.some(term => text.includes(term));

    if (!hasEscrowHolder) {
      flags.push(this.createFlag('NO_ESCROW_HOLDER', 'Escrow holder not identified in contract', 'high'));
    }

    // Check for problematic escrow arrangements
    const redFlags = [
      { pattern: 'seller holds', severity: 'critical' as RuleSeverity, msg: 'Seller holding earnest money is high risk' },
      { pattern: 'agent holds', severity: 'high' as RuleSeverity, msg: 'Agent holding EMD may not be properly bonded' },
      { pattern: 'directly to seller', severity: 'critical' as RuleSeverity, msg: 'Direct payment to seller bypasses escrow protection' },
    ];

    for (const { pattern, severity, msg } of redFlags) {
      if (text.includes(pattern)) {
        flags.push(this.createFlag('RISKY_ESCROW', msg, severity));
      }
    }

    if (flags.length === 0) {
      return this.pass('Escrow holder properly identified');
    }

    return this.fail(flags, 'Escrow arrangement concerns detected', [
      'Ensure EMD is held by neutral third-party escrow',
      'Verify escrow holder is licensed and bonded',
    ]);
  }
}

/**
 * Rule: Check for EMD refund conditions
 */
export class EMDRefundConditionsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'EMD_REFUND',
      'EMD Refund Conditions',
      'Verifies refund conditions are clearly defined',
      'earnest_money',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for refund language
    const refundTerms = ['refund', 'return of deposit', 'emd returned', 'deposit refunded'];
    const hasRefundTerms = refundTerms.some(term => text.includes(term));

    if (!hasRefundTerms) {
      flags.push(this.createFlag('NO_REFUND_TERMS', 'No EMD refund conditions specified', 'high'));
    }

    // Check for non-refundable language
    if (text.includes('non-refundable') || text.includes('nonrefundable')) {
      flags.push(this.createFlag(
        'NON_REFUNDABLE',
        'EMD marked as non-refundable - high buyer risk',
        'critical'
      ));
    }

    // Check for liquidated damages
    if (text.includes('liquidated damages') && !text.includes('not exceed')) {
      flags.push(this.createFlag(
        'LIQUIDATED_DAMAGES',
        'Liquidated damages clause may affect EMD recovery',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('EMD refund conditions are defined');
    }

    return this.fail(flags, 'EMD refund terms need review', [
      'Clarify conditions under which EMD is refundable',
      'Consider adding contingency protections',
    ]);
  }
}

// Factory function to create all earnest money rules
export function createEarnestMoneyRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new EarnestMoneyAmountRule(config),
    new EarnestMoneyTimelineRule(config),
    new EscrowHolderRule(config),
    new EMDRefundConditionsRule(config),
  ];
}
