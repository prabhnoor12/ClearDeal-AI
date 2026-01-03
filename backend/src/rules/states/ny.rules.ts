// New York state-specific rules: Validates NY real estate disclosure and legal requirements
import { BaseRule, RuleContext, RuleResult, RuleConfig } from '../base.rule';
import { RiskFlag } from '../../types/risk.types';

/**
 * Rule: New York Property Condition Disclosure Statement (PCDS)
 */
export class NewYorkPCDSRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_PCDS',
      'New York Property Condition Disclosure',
      'Verifies PCDS compliance or $500 credit per NY Property Condition Disclosure Act',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasPCDS = text.includes('property condition disclosure') || 
      text.includes('pcds') ||
      text.includes('condition disclosure statement');

    const hasCredit = text.includes('$500') || text.includes('500 credit') ||
      text.includes('disclosure credit');

    if (!hasPCDS && !hasCredit) {
      flags.push(this.createFlag(
        'NO_PCDS',
        'Neither PCDS nor $500 credit mentioned - NY law requires one or the other',
        'critical'
      ));
    }

    if (hasCredit && !hasPCDS) {
      flags.push(this.createFlag(
        'CREDIT_ONLY',
        'Seller opting for $500 credit instead of PCDS - buyer loses disclosure protection',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Property Condition Disclosure requirements addressed');
    }

    return this.fail(flags, 'NY disclosure requirements not met', [
      'Seller must provide PCDS or $500 credit at closing',
      'Consider requesting PCDS even if seller offers credit',
    ]);
  }
}

/**
 * Rule: New York Lead Paint Disclosure
 */
export class NewYorkLeadPaintRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_LEAD_PAINT',
      'New York Lead Paint Disclosure',
      'Verifies lead paint disclosure for pre-1978 properties',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasLeadDisclosure = text.includes('lead') || text.includes('lead-based paint');

    // Check for pre-1978 construction
    const yearPattern = /(?:built|constructed|year)[^.]*?(19[0-7]\d|19[0-6]\d)/gi;
    const matches = this.findPatterns(text, [yearPattern]);
    const isPre1978 = matches.length > 0;

    if (isPre1978 && !hasLeadDisclosure) {
      flags.push(this.createFlag(
        'NO_LEAD_DISCLOSURE',
        'Pre-1978 property requires lead paint disclosure',
        'critical'
      ));
    }

    if (!hasLeadDisclosure) {
      flags.push(this.createFlag(
        'LEAD_NOT_ADDRESSED',
        'Lead paint disclosure not found - required for pre-1978 homes',
        'high'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Lead paint disclosure addressed');
    }

    return this.fail(flags, 'Lead paint disclosure issues', [
      'Federal law requires lead paint disclosure for pre-1978 homes',
      'Buyer has 10 days to conduct lead inspection',
    ]);
  }
}

/**
 * Rule: New York Attorney Review Period
 */
export class NewYorkAttorneyReviewRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_ATTORNEY_REVIEW',
      'New York Attorney Review',
      'Verifies attorney review provisions (standard in NY transactions)',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasAttorneyReview = text.includes('attorney review') || 
      text.includes('attorney approval') ||
      text.includes('counsel review');

    if (!hasAttorneyReview) {
      flags.push(this.createFlag(
        'NO_ATTORNEY_REVIEW',
        'Attorney review period not specified - standard practice in NY',
        'high'
      ));
    }

    // Check for attorney contingency
    if (text.includes('attorney') && text.includes('disapprove')) {
      // Good - attorney can disapprove
    } else if (hasAttorneyReview) {
      flags.push(this.createFlag(
        'LIMITED_ATTORNEY_RIGHTS',
        'Attorney review may not include disapproval rights',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Attorney review provisions present');
    }

    return this.fail(flags, 'Attorney review concerns', [
      'NY transactions typically include attorney review period',
      'Both parties should have attorney representation',
    ]);
  }
}

/**
 * Rule: New York Condo/Co-op Board Approval
 */
export class NewYorkBoardApprovalRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_BOARD_APPROVAL',
      'New York Board Approval Contingency',
      'Verifies board approval contingency for co-ops and condos',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const isCoop = text.includes('co-op') || text.includes('coop') || text.includes('cooperative');
    const isCondo = text.includes('condo') || text.includes('condominium');

    if (!isCoop && !isCondo) {
      return this.pass('Not a co-op or condo transaction');
    }

    const hasBoardApproval = text.includes('board approval') || 
      text.includes('board contingency') ||
      text.includes('board interview');

    if (!hasBoardApproval) {
      flags.push(this.createFlag(
        'NO_BOARD_CONTINGENCY',
        `${isCoop ? 'Co-op' : 'Condo'} transaction requires board approval contingency`,
        'critical'
      ));
    }

    // Co-op specific checks
    if (isCoop) {
      if (!text.includes('flip tax') && !text.includes('transfer fee')) {
        flags.push(this.createFlag('NO_FLIP_TAX', 'Flip tax/transfer fee not addressed', 'medium'));
      }
      if (!text.includes('sublet') && !text.includes('sublease')) {
        flags.push(this.createFlag('NO_SUBLET_POLICY', 'Sublet policy not mentioned', 'low'));
      }
    }

    if (flags.length === 0) {
      return this.pass('Board approval contingency present');
    }

    return this.fail(flags, 'Board approval issues', [
      'Include board approval contingency with refund of deposit if rejected',
      'Verify board application requirements and timeline',
    ]);
  }
}

/**
 * Rule: New York Mansion Tax
 */
export class NewYorkMansionTaxRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_MANSION_TAX',
      'New York Mansion Tax',
      'Checks for mansion tax disclosure on properties $1M+',
      'state_specific',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';

    // Look for purchase price
    const pricePatterns = [/\$\s*([\d,]+(?:,\d{3})*)/gi];
    const matches = this.findPatterns(text, pricePatterns);
    const prices = this.extractNumbers(matches.join(' '), /[\d,]+/g)
      .map(p => typeof p === 'number' ? p : parseFloat(String(p).replace(/,/g, '')))
      .filter(p => p > 100000);

    const isOverMillion = prices.some(p => p >= 1000000);

    if (!isOverMillion) {
      return this.pass('Property under $1M - mansion tax not applicable');
    }

    const hasMansionTax = text.includes('mansion tax') || text.includes('transfer tax');

    if (!hasMansionTax) {
      return this.fail(
        [this.createFlag('NO_MANSION_TAX', 'Mansion tax (1%+) not addressed for $1M+ property', 'medium')],
        'Mansion tax disclosure missing',
        ['NY mansion tax applies to purchases $1M and above', 'Rate increases at higher price thresholds']
      );
    }

    return this.pass('Mansion tax addressed');
  }
}

/**
 * Rule: New York Smoke/CO Detector Affidavit
 */
export class NewYorkDetectorRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'NY_DETECTORS',
      'New York Smoke/CO Detector Compliance',
      'Verifies smoke and CO detector affidavit requirement',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    if (!text.includes('smoke detector') && !text.includes('smoke alarm')) {
      flags.push(this.createFlag('NO_SMOKE', 'Smoke detector compliance not addressed', 'high'));
    }

    if (!text.includes('carbon monoxide') && !text.includes('co detector')) {
      flags.push(this.createFlag('NO_CO', 'Carbon monoxide detector compliance not addressed', 'high'));
    }

    if (flags.length === 0) {
      return this.pass('Detector compliance addressed');
    }

    return this.fail(flags, 'Detector affidavit requirements', [
      'Seller must provide smoke/CO detector affidavit at closing',
      'Detectors must be operational and properly located',
    ]);
  }
}

// Factory function to create all New York rules
export function createNewYorkRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new NewYorkPCDSRule(config),
    new NewYorkLeadPaintRule(config),
    new NewYorkAttorneyReviewRule(config),
    new NewYorkBoardApprovalRule(config),
    new NewYorkMansionTaxRule(config),
    new NewYorkDetectorRule(config),
  ];
}

// Export state identifier
export const STATE_CODE = 'NY';
export const STATE_NAME = 'New York';
