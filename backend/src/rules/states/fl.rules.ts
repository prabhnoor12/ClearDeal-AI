// Florida state-specific rules: Validates FL real estate disclosure and legal requirements
import { BaseRule, RuleContext, RuleResult, RuleConfig } from '../base.rule';
import { RiskFlag } from '../../types/risk.types';

/**
 * Rule: Florida Seller's Disclosure Requirements
 */
export class FloridaSellerDisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_SELLER_DISCLOSURE',
      'Florida Seller Disclosure',
      'Verifies seller disclosure of known material defects',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Florida requires disclosure of known material defects (Johnson v. Davis)
    const hasDisclosure = text.includes('seller disclosure') || 
      text.includes('property disclosure') ||
      text.includes('material defects');

    if (!hasDisclosure) {
      flags.push(this.createFlag(
        'NO_DISCLOSURE',
        'No seller disclosure of material defects found',
        'high'
      ));
    }

    // Check for "as-is" with proper Johnson v. Davis language
    if (text.includes('as-is') || text.includes('as is')) {
      if (!text.includes('known defects') && !text.includes('latent defects')) {
        flags.push(this.createFlag(
          'AS_IS_INCOMPLETE',
          'As-is sale but seller must still disclose known latent defects under Florida law',
          'high'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('Seller disclosure requirements addressed');
    }

    return this.fail(flags, 'Florida disclosure requirements not met', [
      'Seller must disclose known material defects (Johnson v. Davis)',
      'As-is clause does not eliminate duty to disclose known defects',
    ]);
  }
}

/**
 * Rule: Florida Flood Zone Disclosure
 */
export class FloridaFloodZoneRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_FLOOD_ZONE',
      'Florida Flood Zone Disclosure',
      'Verifies flood zone disclosure requirements',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasFloodDisclosure = text.includes('flood zone') || 
      text.includes('flood insurance') ||
      text.includes('fema') ||
      text.includes('special flood hazard');

    if (!hasFloodDisclosure) {
      flags.push(this.createFlag(
        'NO_FLOOD_DISCLOSURE',
        'No flood zone information found - critical for Florida properties',
        'critical'
      ));
    }

    // Check for high-risk flood zones
    const highRiskZones = ['zone a', 'zone ae', 'zone v', 'zone ve', 'special flood hazard'];
    for (const zone of highRiskZones) {
      if (text.includes(zone)) {
        flags.push(this.createFlag(
          'HIGH_RISK_FLOOD',
          `Property in high-risk flood zone - flood insurance likely required`,
          'high'
        ));
        break;
      }
    }

    // Check for flood insurance requirement acknowledgment
    if (text.includes('flood') && !text.includes('flood insurance')) {
      flags.push(this.createFlag(
        'NO_INSURANCE_MENTION',
        'Flood zone mentioned but flood insurance requirement not addressed',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Flood zone disclosure present');
    }

    return this.fail(flags, 'Flood disclosure issues', [
      'Verify FEMA flood zone designation',
      'Confirm flood insurance requirements with lender',
    ]);
  }
}

/**
 * Rule: Florida Homeowners Association Disclosure
 */
export class FloridaHOADisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_HOA',
      'Florida HOA Disclosure',
      'Verifies HOA disclosure requirements under Florida Statute 720',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasHOA = text.includes('hoa') || 
      text.includes('homeowners association') ||
      text.includes('community association');

    if (!hasHOA) {
      return this.pass('No HOA detected');
    }

    // Florida Statute 720.401 required disclosures
    const requiredDisclosures = [
      { term: 'assessment', desc: 'HOA assessment amounts' },
      { term: 'governing documents', desc: 'Governing documents availability' },
      { term: 'budget', desc: 'HOA budget information' },
    ];

    for (const { term, desc } of requiredDisclosures) {
      if (!text.includes(term)) {
        flags.push(this.createFlag('HOA_MISSING_INFO', `${desc} not disclosed`, 'medium'));
      }
    }

    // Check for buyer's 3-day cancellation right
    if (!text.includes('3 day') && !text.includes('three day') && !text.includes('cancellation')) {
      flags.push(this.createFlag(
        'NO_CANCELLATION_RIGHT',
        'Buyer\'s 3-day cancellation right after receiving HOA docs not mentioned',
        'high'
      ));
    }

    if (flags.length === 0) {
      return this.pass('HOA disclosure requirements met');
    }

    return this.fail(flags, 'HOA disclosure gaps', [
      'Provide HOA disclosure summary per Florida Statute 720.401',
      'Buyer has 3 days to cancel after receiving HOA documents',
    ]);
  }
}

/**
 * Rule: Florida Radon Gas Disclosure
 */
export class FloridaRadonRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_RADON',
      'Florida Radon Gas Disclosure',
      'Verifies radon gas disclosure per Florida Statute 404.056',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';

    // Florida requires radon gas disclosure in all real estate contracts
    const hasRadonDisclosure = text.includes('radon') || text.includes('radon gas');

    if (!hasRadonDisclosure) {
      return this.fail(
        [this.createFlag('NO_RADON', 'Florida-required radon gas disclosure not found', 'high')],
        'Radon disclosure missing',
        ['Add Florida Statute 404.056 radon disclosure language', 'Radon disclosure is mandatory in all Florida contracts']
      );
    }

    return this.pass('Radon gas disclosure present');
  }
}

/**
 * Rule: Florida Energy Efficiency Disclosure
 */
export class FloridaEnergyDisclosureRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_ENERGY',
      'Florida Energy Efficiency Disclosure',
      'Verifies energy efficiency rating disclosure',
      'state_specific',
      { severity: 'low', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';

    const hasEnergyInfo = text.includes('energy efficiency') || 
      text.includes('energy rating') ||
      text.includes('building energy');

    if (!hasEnergyInfo) {
      return this.fail(
        [this.createFlag('NO_ENERGY', 'Energy efficiency information not provided', 'low')],
        'Energy disclosure not found',
        ['Consider including energy efficiency information']
      );
    }

    return this.pass('Energy efficiency information addressed');
  }
}

/**
 * Rule: Florida Hurricane/Wind Mitigation
 */
export class FloridaWindMitigationRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'FL_WIND',
      'Florida Wind Mitigation',
      'Checks for wind mitigation and hurricane protection disclosures',
      'state_specific',
      { severity: 'medium', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for wind mitigation information
    const windTerms = ['wind mitigation', 'hurricane', 'wind insurance', 'windstorm'];
    const hasWindInfo = windTerms.some(term => text.includes(term));

    if (!hasWindInfo) {
      flags.push(this.createFlag(
        'NO_WIND_INFO',
        'No wind mitigation or hurricane protection information found',
        'medium'
      ));
    }

    // Check for wind insurance concerns
    if (text.includes('wind') && text.includes('exclusion')) {
      flags.push(this.createFlag(
        'WIND_EXCLUSION',
        'Wind damage may be excluded from standard insurance',
        'high'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Wind mitigation information present');
    }

    return this.fail(flags, 'Wind/hurricane disclosure gaps', [
      'Obtain wind mitigation inspection for insurance discounts',
      'Verify wind coverage in insurance policy',
    ]);
  }
}

// Factory function to create all Florida rules
export function createFloridaRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new FloridaSellerDisclosureRule(config),
    new FloridaFloodZoneRule(config),
    new FloridaHOADisclosureRule(config),
    new FloridaRadonRule(config),
    new FloridaEnergyDisclosureRule(config),
    new FloridaWindMitigationRule(config),
  ];
}

// Export state identifier
export const STATE_CODE = 'FL';
export const STATE_NAME = 'Florida';
