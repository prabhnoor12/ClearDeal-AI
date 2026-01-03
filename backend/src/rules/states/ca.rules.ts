// California state-specific rules: Validates CA real estate disclosure and legal requirements
import { BaseRule, RuleContext, RuleResult, RuleConfig } from '../base.rule';
import { RiskFlag } from '../../types/risk.types';

/**
 * Rule: California Transfer Disclosure Statement
 */
export class CaliforniaTDSRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'CA_TDS',
      'California TDS Requirement',
      'Verifies Transfer Disclosure Statement compliance',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const disclosureNames = context.disclosures.map(d => d.name.toLowerCase());

    const hasTDS = disclosureNames.some(name => 
      name.includes('transfer disclosure') || name.includes('tds')
    ) || text.includes('transfer disclosure statement');

    if (!hasTDS) {
      return this.fail(
        [this.createFlag('TDS_MISSING', 'California Transfer Disclosure Statement (TDS) not found', 'critical')],
        'TDS is mandatory for most California residential sales',
        ['Seller must complete and provide TDS', 'Buyer has right to rescind within 3 days of receiving TDS']
      );
    }

    return this.pass('Transfer Disclosure Statement referenced');
  }
}

/**
 * Rule: California Natural Hazard Disclosure
 */
export class CaliforniaNHDRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'CA_NHD',
      'California NHD Requirement',
      'Verifies Natural Hazard Disclosure compliance',
      'state_specific',
      { severity: 'critical', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const disclosureNames = context.disclosures.map(d => d.name.toLowerCase());
    const flags: RiskFlag[] = [];

    const hasNHD = disclosureNames.some(name => 
      name.includes('natural hazard') || name.includes('nhd')
    ) || text.includes('natural hazard disclosure');

    if (!hasNHD) {
      flags.push(this.createFlag('NHD_MISSING', 'Natural Hazard Disclosure (NHD) not found', 'critical'));
    }

    // Check for specific hazard zones
    const hazardZones = [
      { pattern: 'flood zone', name: 'Flood Zone' },
      { pattern: 'earthquake fault', name: 'Earthquake Fault Zone' },
      { pattern: 'seismic hazard', name: 'Seismic Hazard Zone' },
      { pattern: 'fire hazard', name: 'Fire Hazard Severity Zone' },
      { pattern: 'wildfire', name: 'Wildfire Risk Area' },
    ];

    for (const { pattern, name } of hazardZones) {
      if (text.includes(pattern)) {
        flags.push(this.createFlag('HAZARD_ZONE', `Property in ${name} - verify insurance requirements`, 'medium'));
      }
    }

    if (flags.length === 0) {
      return this.pass('Natural Hazard Disclosure present');
    }

    return this.fail(flags, 'Natural hazard disclosure issues', [
      'Obtain NHD report from licensed disclosure company',
      'Review hazard zone implications for insurance',
    ]);
  }
}

/**
 * Rule: California Mello-Roos/Special Tax Disclosure
 */
export class CaliforniaMelloRoosRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'CA_MELLO_ROOS',
      'California Mello-Roos Disclosure',
      'Checks for Mello-Roos and special tax disclosures',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    const hasMelloRoos = text.includes('mello-roos') || text.includes('mello roos');
    const hasSpecialTax = text.includes('special tax') || text.includes('special assessment');

    if (hasMelloRoos || hasSpecialTax) {
      // Mello-Roos is present - check for amount disclosure
      const amountPattern = /mello.?roos[^.]*?\$?([\d,]+)/gi;
      const matches = this.findPatterns(text, [amountPattern]);

      if (matches.length === 0) {
        flags.push(this.createFlag(
          'MELLO_ROOS_AMOUNT',
          'Mello-Roos mentioned but annual amount not specified',
          'medium'
        ));
      }
    }

    // Check if property might be in a CFD (Community Facilities District)
    if (text.includes('cfd') || text.includes('community facilities district')) {
      flags.push(this.createFlag(
        'CFD_PRESENT',
        'Property in Community Facilities District - verify tax obligations',
        'medium'
      ));
    }

    if (flags.length === 0) {
      return this.pass('No Mello-Roos issues detected');
    }

    return this.fail(flags, 'Special tax disclosure needed', [
      'Disclose annual Mello-Roos amount to buyer',
      'Verify CFD bond payoff terms',
    ]);
  }
}

/**
 * Rule: California Earthquake Safety Disclosures
 */
export class CaliforniaEarthquakeRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'CA_EARTHQUAKE',
      'California Earthquake Disclosures',
      'Verifies earthquake-related disclosure requirements',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    // Check for earthquake hazard zone disclosure
    if (!text.includes('earthquake') && !text.includes('seismic')) {
      flags.push(this.createFlag(
        'NO_EARTHQUAKE_DISCLOSURE',
        'No earthquake/seismic hazard information found',
        'medium'
      ));
    }

    // Check for retrofit requirements (pre-1979 homes)
    if (text.includes('bolt') || text.includes('retrofit') || text.includes('foundation')) {
      // Good - retrofit mentioned
    } else if (text.includes('built') || text.includes('constructed')) {
      // Check for older homes that may need retrofit
      const yearPattern = /(?:built|constructed)[^.]*?(19[0-7]\d)/gi;
      const matches = this.findPatterns(text, [yearPattern]);
      if (matches.length > 0) {
        flags.push(this.createFlag(
          'RETROFIT_CHECK',
          'Pre-1980 home may require seismic retrofit - verify compliance',
          'medium'
        ));
      }
    }

    if (flags.length === 0) {
      return this.pass('Earthquake disclosures addressed');
    }

    return this.fail(flags, 'Earthquake disclosure gaps', [
      'Include earthquake hazard zone status',
      'Verify seismic retrofit compliance if applicable',
    ]);
  }
}

/**
 * Rule: California Smoke/CO Detector Compliance
 */
export class CaliforniaDetectorRule extends BaseRule {
  constructor(config: Partial<RuleConfig> = {}) {
    super(
      'CA_DETECTORS',
      'California Smoke/CO Detector Compliance',
      'Verifies smoke and carbon monoxide detector requirements',
      'state_specific',
      { severity: 'high', ...config }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const flags: RiskFlag[] = [];

    if (!text.includes('smoke detector') && !text.includes('smoke alarm')) {
      flags.push(this.createFlag(
        'NO_SMOKE_DETECTOR',
        'Smoke detector compliance not addressed',
        'high'
      ));
    }

    if (!text.includes('carbon monoxide') && !text.includes('co detector')) {
      flags.push(this.createFlag(
        'NO_CO_DETECTOR',
        'Carbon monoxide detector compliance not addressed',
        'high'
      ));
    }

    if (flags.length === 0) {
      return this.pass('Detector compliance addressed');
    }

    return this.fail(flags, 'Detector compliance not verified', [
      'California requires smoke detectors in all sleeping areas',
      'CO detectors required in homes with fossil fuel appliances',
    ]);
  }
}

// Factory function to create all California rules
export function createCaliforniaRules(config: Partial<RuleConfig> = {}): BaseRule[] {
  return [
    new CaliforniaTDSRule(config),
    new CaliforniaNHDRule(config),
    new CaliforniaMelloRoosRule(config),
    new CaliforniaEarthquakeRule(config),
    new CaliforniaDetectorRule(config),
  ];
}

// Export state identifier
export const STATE_CODE = 'CA';
export const STATE_NAME = 'California';
