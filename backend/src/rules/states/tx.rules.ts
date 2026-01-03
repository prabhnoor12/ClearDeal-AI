// Texas state-specific rules: Validates TX real estate disclosure and legal requirements
import { BaseRule, RuleContext, RuleResult, RuleConfig } from '../base.rule';
import { RiskFlag } from '../../types/risk.types';

/**
 * Rule: Texas Seller's Disclosure Notice
 */
export class TexasSellerDisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_SELLER_DISCLOSURE',
      'Texas Seller Disclosure Notice',
      'Verifies Seller\'s Disclosure Notice per Texas Property Code Section 5.008',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasDisclosure = text.includes('seller\'s disclosure') || 
      text.includes('sellers disclosure') ||
      text.includes('property disclosure notice');

    if (!hasDisclosure) {
      flags.push(this.createFlag(
        'NO_DISCLOSURE',
        'Texas Seller\'s Disclosure Notice not found',
        'critical'
      ));
    }

    // Check for TREC form reference
    if (!text.includes('trec') && !text.includes('texas real estate commission')) {
      flags.push(this.createFlag(
        'NO_TREC_FORM',
        'TREC-promulgated form not referenced',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Seller\'s Disclosure Notice requirements met');
    }

    return this.fail(flags, 'Texas disclosure requirements not met', [
      'Seller must provide Seller\'s Disclosure Notice',
      'Use TREC-promulgated forms for Texas transactions',
    ]);
  }
}

/**
 * Rule: Texas Option Period
 */
export class TexasOptionPeriodRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_OPTION_PERIOD',
      'Texas Option Period',
      'Validates option period terms and option fee',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasOptionPeriod = text.includes('option period') || text.includes('option fee');

    if (!hasOptionPeriod) {
      flags.push(this.createFlag(
        'NO_OPTION_PERIOD',
        'No option period specified - buyer loses unrestricted termination right',
        'high'
      ));
    }

    // Check for option fee amount
    if (hasOptionPeriod) {
      const optionFeePattern = /option\s+fee[^.]*?\$?([\d,]+)/gi;
      const matches = this.findPatterns(text, [optionFeePattern]);
      
      if (matches.length === 0) {
        flags.push(this.createFlag(
          'NO_OPTION_FEE',
          'Option fee amount not specified',
          'medium'
        ));
      }

      // Check option period length
      const daysPattern = /option\s+period[^.]*?(\d+)\s*days?/gi;
      const dayMatches = this.findPatterns(text, [daysPattern]);
      const days = this.extractNumbers(dayMatches.join(' '), /\d+/g);

      for (const dayCount of days) {
        if (dayCount < 7) {
          flags.push(this.createFlag(
            'SHORT_OPTION',
            `Option period of ${dayCount} days may not allow adequate inspection time`,
            'medium'
          ));
        }
      }
    }

    if (flags.length === 0) {
      return this.pass('Option period terms are defined');
    }

    return this.fail(flags, 'Option period concerns', [
      'Option period gives buyer unrestricted right to terminate',
      'Option fee is typically non-refundable but credited at closing',
    ]);
  }
}

/**
 * Rule: Texas MUD/PID Disclosure
 */
export class TexasMUDDisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_MUD_PID',
      'Texas MUD/PID Disclosure',
      'Verifies Municipal Utility District and Public Improvement District disclosures',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for MUD
    const hasMUD = text.includes('mud') || text.includes('municipal utility district');
    const hasPID = text.includes('pid') || text.includes('public improvement district');

    if (hasMUD) {
      if (!text.includes('mud tax') && !text.includes('mud assessment')) {
        flags.push(this.createFlag(
          'MUD_NO_TAX_INFO',
          'Property in MUD but tax/assessment information not disclosed',
          'high'
        ));
      }
    }

    if (hasPID) {
      if (!text.includes('pid assessment') && !text.includes('improvement assessment')) {
        flags.push(this.createFlag(
          'PID_NO_ASSESSMENT',
          'Property in PID but assessment information not disclosed',
          'high'
        ));
      }
    }

    // Check for addendum
    if ((hasMUD || hasPID) && !text.includes('addendum')) {
      flags.push(this.createFlag(
        'NO_DISTRICT_ADDENDUM',
        'MUD/PID property should include appropriate TREC addendum',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('No MUD/PID issues detected or properly disclosed');
    }

    return this.fail(flags, 'Special district disclosure issues', [
      'MUD/PID can significantly impact property taxes',
      'Use TREC MUD or PID addendum as applicable',
    ]);
  }
}

/**
 * Rule: Texas HOA Disclosure
 */
export class TexasHOARule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_HOA',
      'Texas HOA Disclosure',
      'Verifies HOA disclosure requirements per Texas Property Code',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasHOA = text.includes('hoa') || 
      text.includes('homeowners association') ||
      text.includes('property owners association');

    if (!hasHOA) {
      return this.pass('No HOA detected');
    }

    // Texas requires specific HOA disclosures
    const requiredItems = [
      { term: 'resale certificate', desc: 'HOA resale certificate' },
      { term: 'assessment', desc: 'HOA assessment amounts' },
      { term: 'subdivision information', desc: 'Subdivision information' },
    ];

    for (const { term, desc } of requiredItems) {
      if (!text.includes(term)) {
        flags.push(this.createFlag('HOA_MISSING', `${desc} not addressed`, 'medium'));
      }
    }

    // Check for HOA addendum
    if (!text.includes('hoa addendum') && !text.includes('addendum for property subject to')) {
      flags.push(this.createFlag(
        'NO_HOA_ADDENDUM',
        'TREC HOA Addendum may be required',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('HOA disclosure requirements addressed');
    }

    return this.fail(flags, 'HOA disclosure gaps', [
      'Obtain HOA resale certificate',
      'Include TREC Addendum for Property Subject to HOA',
    ]);
  }
}

/**
 * Rule: Texas Survey Requirements
 */
export class TexasSurveyRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_SURVEY',
      'Texas Survey Requirements',
      'Validates survey provisions and requirements',
      'state_specific',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasSurvey = text.includes('survey');

    if (!hasSurvey) {
      flags.push(this.createFlag(
        'NO_SURVEY_MENTION',
        'Survey requirements not addressed',
        'medium'
      ));
    } else {
      // Check who provides survey
      if (!text.includes('existing survey') && !text.includes('new survey')) {
        flags.push(this.createFlag(
          'SURVEY_TYPE_UNCLEAR',
          'Not specified whether existing or new survey will be used',
          'low'
        ));
      }

      // Check for survey objection period
      if (!text.includes('survey objection') && !text.includes('object to survey')) {
        flags.push(this.createFlag(
          'NO_SURVEY_OBJECTION',
          'Survey objection period not specified',
          'low'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('Survey requirements addressed');
    }

    return this.fail(flags, 'Survey provision issues', [
      'Specify whether new or existing survey will be provided',
      'Include survey objection period',
    ]);
  }
}

/**
 * Rule: Texas Title Policy and Commitment
 */
export class TexasTitleRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'TX_TITLE',
      'Texas Title Requirements',
      'Verifies title commitment and policy provisions',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    if (!text.includes('title commitment') && !text.includes('title insurance')) {
      flags.push(this.createFlag(
        'NO_TITLE',
        'Title commitment/insurance not addressed',
        'high'
      ));
    }

    // Check for title objection period
    if (!text.includes('title objection') && !text.includes('object to title')) {
      flags.push(this.createFlag(
        'NO_TITLE_OBJECTION',
        'Title objection period not specified',
        'medium'
      ));
    }

    // Check for owner's policy
    if (text.includes('title') && !text.includes('owner\'s policy') && !text.includes('owners policy')) {
      flags.push(this.createFlag(
        'NO_OWNERS_POLICY',
        'Owner\'s title policy not specifically mentioned',
        'low'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Title requirements addressed');
    }

    return this.fail(flags, 'Title provision issues', [
      'Title commitment should be delivered within specified timeframe',
      'Include title objection period for buyer review',
    ]);
  }
}

// Factory function to create all Texas rules
export function createTexasRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new TexasSellerDisclosureRule(config),
    new TexasOptionPeriodRule(config),
    new TexasMUDDisclosureRule(config),
    new TexasHOARule(config),
    new TexasSurveyRule(config),
    new TexasTitleRule(config),
  ];
}

// Export state identifier
export const STATE_CODE = 'TX';
export const STATE_NAME = 'Texas';
