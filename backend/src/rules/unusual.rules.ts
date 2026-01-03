// Unusual clause rules: Detects non-standard, risky, or uncommon contract terms
import { BaseRule, RuleContext, RuleResult, RuleConfig, RuleSeverity } from './base.rule';
import { RiskFlag } from '../types/risk.types';

// Red flag phrases that indicate unusual or risky terms
const RED_FLAG_PHRASES: { pattern: string; severity: RuleSeverity; description: string }[] = [
  { pattern: 'waive all rights', severity: 'critical', description: 'Broad waiver of legal rights' },
  { pattern: 'hold harmless', severity: 'high', description: 'Hold harmless clause may limit recourse' },
  { pattern: 'indemnify seller', severity: 'high', description: 'Buyer indemnification of seller' },
  { pattern: 'no recourse', severity: 'critical', description: 'Buyer has no legal recourse' },
  { pattern: 'binding arbitration', severity: 'medium', description: 'Mandatory arbitration limits legal options' },
  { pattern: 'waive jury trial', severity: 'high', description: 'Waiver of right to jury trial' },
  { pattern: 'automatic renewal', severity: 'medium', description: 'Contract may auto-renew' },
  { pattern: 'penalty clause', severity: 'high', description: 'Penalty provisions detected' },
  { pattern: 'sole discretion', severity: 'medium', description: 'One party has sole discretion' },
  { pattern: 'time is of the essence', severity: 'low', description: 'Strict deadline enforcement' },
  { pattern: 'as-is where-is', severity: 'high', description: 'Property sold with no warranties' },
  { pattern: 'sight unseen', severity: 'critical', description: 'Purchase without physical inspection' },
];

// Unusual transaction types
const UNUSUAL_TRANSACTIONS = [
  { pattern: 'leaseback', description: 'Seller leaseback arrangement' },
  { pattern: 'seller financing', description: 'Seller-provided financing' },
  { pattern: 'land contract', description: 'Land contract/contract for deed' },
  { pattern: 'subject to existing', description: 'Subject to existing mortgage' },
  { pattern: 'wraparound', description: 'Wraparound mortgage' },
  { pattern: 'assignment of contract', description: 'Contract assignment rights' },
];

/**
 * Rule: Detect red flag phrases in contract
 */
export class RedFlagPhrasesRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'UNUSUAL_RED_FLAGS',
      'Red Flag Phrases',
      'Detects concerning language patterns in contract',
      'unusual_clause',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    for (const { pattern, severity, description } of RED_FLAG_PHRASES) {
      if (text.includes(pattern)) {
        flags.push(this.createFlag('RED_FLAG', description, severity));
      }
    }

    if (flags.length === 0) {
      return this.pass('No red flag phrases detected');
    }

    return this.fail(
      flags,
      `${flags.length} concerning phrase(s) found`,
      ['Have attorney review flagged clauses', 'Request removal or modification of concerning terms']
    );
  }
}

/**
 * Rule: Detect unusual transaction structures
 */
export class UnusualTransactionRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'UNUSUAL_TRANSACTION',
      'Unusual Transaction Type',
      'Identifies non-standard transaction structures',
      'unusual_clause',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];
    const found: string[] = [];

    for (const { pattern, description } of UNUSUAL_TRANSACTIONS) {
      if (text.includes(pattern)) {
        found.push(description);
        flags.push(this.createFlag('UNUSUAL_TYPE', description, 'medium'));
      }
    }

    if (flags.length === 0) {
      return this.pass('Standard transaction structure');
    }

    return this.fail(
      flags,
      `Unusual transaction type: ${found.join(', ')}`,
      ['Ensure all parties understand non-standard terms', 'Consult with attorney on legal implications']
    );
  }
}

/**
 * Rule: Detect one-sided or unbalanced terms
 */
export class UnbalancedTermsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'UNUSUAL_UNBALANCED',
      'Unbalanced Contract Terms',
      'Identifies terms that favor one party excessively',
      'unusual_clause',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for one-sided cancellation rights
    if (text.includes('seller may cancel') && !text.includes('buyer may cancel')) {
      flags.push(this.createFlag('ONE_SIDED_CANCEL', 'Seller can cancel but buyer cannot', 'high'));
    }

    // Check for unequal default penalties
    if ((text.includes('buyer default') && text.includes('forfeit')) &&
        !(text.includes('seller default') && text.includes('damages'))) {
      flags.push(this.createFlag('UNEQUAL_DEFAULT', 'Unequal default consequences', 'high'));
    }

    // Check for unlimited liability
    if (text.includes('unlimited liability') || text.includes('all damages')) {
      flags.push(this.createFlag('UNLIMITED_LIABILITY', 'Unlimited liability exposure', 'critical'));
    }

    // Check for excessive extension rights
    if (text.includes('extend') && text.includes('sole discretion')) {
      flags.push(this.createFlag('UNILATERAL_EXTENSION', 'One party can unilaterally extend', 'medium'));
    }

    if (flags.length === 0) {
      return this.pass('No obviously unbalanced terms detected');
    }

    return this.fail(flags, 'Contract contains unbalanced terms', [
      'Negotiate more balanced terms',
      'Ensure mutual rights and obligations',
    ]);
  }
}

/**
 * Rule: Detect unusual addenda or amendments
 */
export class UnusualAddendaRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'UNUSUAL_ADDENDA',
      'Unusual Addenda Check',
      'Reviews addenda for non-standard provisions',
      'unusual_clause',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const { addenda } = context;
    const flags: RiskFlag[] = [];

    const unusualAddenda = [
      'kick-out',
      'right of first refusal',
      'rent-back',
      'personal property',
      'contingent sale',
      'short sale',
      'reo',
      'foreclosure',
    ];

    for (const addendum of addenda) {
      const name = addendum.name.toLowerCase();
      for (const unusual of unusualAddenda) {
        if (name.includes(unusual) && addendum.included) {
          flags.push(this.createFlag(
            'UNUSUAL_ADDENDUM',
            `Non-standard addendum: ${addendum.name}`,
            'medium'
          ));
        }
      }
    }

    // Check for excessive addenda count
    const includedCount = addenda.filter(a => a.included).length;
    if (includedCount > 5) {
      flags.push(this.createFlag(
        'MANY_ADDENDA',
        `${includedCount} addenda attached - increases complexity`,
        'low'
      ));
    }

    if (flags.length === 0) {
      return this.pass('No unusual addenda detected');
    }

    return this.fail(flags, 'Unusual addenda require review', [
      'Review each addendum carefully',
      'Ensure addenda do not conflict with main contract',
    ]);
  }
}

/**
 * Rule: Detect unusual closing or possession terms
 */
export class UnusualClosingTermsRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'UNUSUAL_CLOSING',
      'Unusual Closing Terms',
      'Identifies non-standard closing or possession arrangements',
      'unusual_clause',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Early possession
    if (text.includes('early possession') || text.includes('possession before closing')) {
      flags.push(this.createFlag('EARLY_POSSESSION', 'Buyer possession before closing - liability risk', 'high'));
    }

    // Delayed possession
    if (text.includes('delayed possession') || text.includes('possession after closing')) {
      flags.push(this.createFlag('DELAYED_POSSESSION', 'Seller retains possession after closing', 'medium'));
    }

    // Extended closing
    const closingPatterns = [/closing\s+(?:in|within)\s+(\d+)\s+days/gi];
    const matches = this.findPatterns(text, closingPatterns);
    const days = this.extractNumbers(matches.join(' '), /\d+/g);

    for (const dayCount of days) {
      if (dayCount > 60) {
        flags.push(this.createFlag('EXTENDED_CLOSING', `Extended closing of ${dayCount} days`, 'medium'));
      }
    }

    // Simultaneous close
    if (text.includes('simultaneous close') || text.includes('back-to-back')) {
      flags.push(this.createFlag('SIMULTANEOUS', 'Simultaneous closing arrangement', 'medium'));
    }

    if (flags.length === 0) {
      return this.pass('Standard closing and possession terms');
    }

    return this.fail(flags, 'Non-standard closing arrangements', [
      'Ensure proper insurance coverage during transition',
      'Document possession terms clearly',
    ]);
  }
}

// Factory function to create all unusual clause rules
export function createUnusualRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new RedFlagPhrasesRule(config),
    new UnusualTransactionRule(config),
    new UnbalancedTermsRule(config),
    new UnusualAddendaRule(config),
    new UnusualClosingTermsRule(config),
  ];
}
