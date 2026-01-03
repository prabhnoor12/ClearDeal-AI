// Contingency rules: Analyze contract contingencies for buyer/seller protection
import { BaseRule, RuleContext, RuleResult, RuleEngine } from './base.rule';

// Common contingency keywords and patterns
const CONTINGENCY_KEYWORDS = {
  financing: ['financing', 'loan', 'mortgage', 'lender', 'pre-approval', 'pre-qualified'],
  inspection: ['inspection', 'inspector', 'home inspection', 'property inspection'],
  appraisal: ['appraisal', 'appraiser', 'appraised value', 'fair market value'],
  title: ['title', 'title insurance', 'clear title', 'title search', 'encumbrance'],
  sale: ['sale of property', 'contingent upon sale', 'buyer\'s property', 'must sell'],
  insurance: ['insurance', 'homeowner\'s insurance', 'hazard insurance'],
};

const TIMELINE_PATTERNS = {
  days: /(\d+)\s*(?:calendar|business|banking)?\s*days?/gi,
  deadline: /(?:within|by|before|no later than)\s+(\d+)\s*days?/gi,
  removal: /contingenc(?:y|ies)\s+(?:removal|waiver|release)/gi,
};

/**
 * Rule: Check for financing contingency presence and terms
 */
export class FinancingContingencyRule extends BaseRule {
  constructor() {
    super(
      'CONT_FINANCING',
      'Financing Contingency Check',
      'Verifies the presence and adequacy of financing contingency terms',
      'contingency',
      { severity: 'high' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const hasFinancingContingency = this.containsKeywords(text, CONTINGENCY_KEYWORDS.financing);

    if (!hasFinancingContingency) {
      return this.fail(
        [this.createFlag('MISSING', 'No financing contingency found in contract', 'critical')],
        'Contract does not appear to include a financing contingency clause',
        ['Add a financing contingency to protect the buyer if loan approval fails']
      );
    }

    // Check for reasonable timeline
    const dayMatches = this.extractNumbers(text, TIMELINE_PATTERNS.days);
    const financingDays = dayMatches.find(d => d >= 14 && d <= 45);

    if (!financingDays) {
      return this.fail(
        [this.createFlag('TIMELINE', 'Financing contingency timeline may be inadequate')],
        'Could not verify a reasonable financing contingency timeline (typically 14-45 days)',
        ['Ensure financing contingency period is clearly specified (typically 21-30 days)']
      );
    }

    // Check for loan type specifications
    const hasLoanDetails = text.includes('loan type') ||
      text.includes('interest rate') ||
      text.includes('loan amount');

    if (!hasLoanDetails) {
      return this.fail(
        [this.createFlag('INCOMPLETE', 'Financing terms not fully specified', 'low')],
        'Financing contingency exists but may lack specific loan terms'
      );
    }

    return this.pass('Financing contingency is present with adequate terms');
  }
}

/**
 * Rule: Check for inspection contingency presence and terms
 */
export class InspectionContingencyRule extends BaseRule {
  constructor() {
    super(
      'CONT_INSPECTION',
      'Inspection Contingency Check',
      'Verifies the presence and adequacy of inspection contingency terms',
      'contingency',
      { severity: 'high' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const hasInspectionContingency = this.containsKeywords(text, CONTINGENCY_KEYWORDS.inspection);

    if (!hasInspectionContingency) {
      return this.fail(
        [this.createFlag('MISSING', 'No inspection contingency found in contract', 'critical')],
        'Contract does not appear to include an inspection contingency clause',
        ['Add an inspection contingency to allow buyer to assess property condition']
      );
    }

    // Check for reasonable inspection period
    const dayMatches = this.extractNumbers(text, TIMELINE_PATTERNS.days);
    const inspectionDays = dayMatches.find(d => d >= 5 && d <= 21);

    if (!inspectionDays) {
      return this.fail(
        [this.createFlag('TIMELINE', 'Inspection period may be too short or not specified')],
        'Could not verify a reasonable inspection period (typically 7-14 days)',
        ['Ensure inspection period is clearly specified (typically 10-14 days)']
      );
    }

    // Check for repair negotiation rights
    const hasRepairRights = text.includes('repair') ||
      text.includes('credit') ||
      text.includes('remedy') ||
      text.includes('negotiate');

    if (!hasRepairRights) {
      return this.fail(
        [this.createFlag('NO_REMEDY', 'No repair/remedy provisions found', 'medium')],
        'Inspection contingency may not include repair negotiation rights'
      );
    }

    return this.pass('Inspection contingency is present with adequate terms');
  }
}

/**
 * Rule: Check for appraisal contingency presence
 */
export class AppraisalContingencyRule extends BaseRule {
  constructor() {
    super(
      'CONT_APPRAISAL',
      'Appraisal Contingency Check',
      'Verifies the presence of appraisal contingency for financed purchases',
      'contingency',
      { severity: 'high' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const hasAppraisalContingency = this.containsKeywords(text, CONTINGENCY_KEYWORDS.appraisal);
    const hasFinancing = this.containsKeywords(text, CONTINGENCY_KEYWORDS.financing);

    // If it's a cash deal, appraisal contingency is less critical
    if (!hasFinancing && text.includes('cash')) {
      if (!hasAppraisalContingency) {
        return this.fail(
          [this.createFlag('OPTIONAL', 'No appraisal contingency (cash purchase)', 'low')],
          'Cash purchase without appraisal contingency - buyer should consider adding one'
        );
      }
    }

    if (hasFinancing && !hasAppraisalContingency) {
      return this.fail(
        [this.createFlag('MISSING', 'No appraisal contingency for financed purchase', 'critical')],
        'Financed purchase without appraisal contingency puts buyer at risk',
        ['Add appraisal contingency to protect against overpaying']
      );
    }

    if (!hasAppraisalContingency) {
      return this.fail(
        [this.createFlag('MISSING', 'No appraisal contingency found')],
        'Contract does not include an appraisal contingency'
      );
    }

    // Check for appraisal gap coverage
    const hasGapCoverage = text.includes('gap') ||
      text.includes('difference') ||
      text.includes('shortfall');

    if (!hasGapCoverage) {
      return this.fail(
        [this.createFlag('NO_GAP', 'No appraisal gap provisions found', 'low')],
        'Consider adding appraisal gap coverage terms'
      );
    }

    return this.pass('Appraisal contingency is present');
  }
}

/**
 * Rule: Check for title contingency
 */
export class TitleContingencyRule extends BaseRule {
  constructor() {
    super(
      'CONT_TITLE',
      'Title Contingency Check',
      'Verifies the presence of clear title requirements',
      'contingency',
      { severity: 'high' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const hasTitleContingency = this.containsKeywords(text, CONTINGENCY_KEYWORDS.title);

    if (!hasTitleContingency) {
      return this.fail(
        [this.createFlag('MISSING', 'No title contingency found', 'critical')],
        'Contract should include provisions for clear and marketable title',
        ['Add title contingency requiring seller to provide clear title']
      );
    }

    // Check for title insurance
    const hasTitleInsurance = text.includes('title insurance') ||
      text.includes('owner\'s policy') ||
      text.includes('lender\'s policy');

    if (!hasTitleInsurance) {
      return this.fail(
        [this.createFlag('NO_INSURANCE', 'Title insurance not specified', 'medium')],
        'Contract should specify title insurance requirements'
      );
    }

    // Check for encumbrance handling
    const hasEncumbranceClause = text.includes('encumbrance') ||
      text.includes('lien') ||
      text.includes('easement') ||
      text.includes('restriction');

    if (!hasEncumbranceClause) {
      return this.fail(
        [this.createFlag('ENCUMBRANCE', 'No encumbrance provisions found', 'low')],
        'Consider adding specific provisions for handling encumbrances'
      );
    }

    return this.pass('Title contingency with adequate protections is present');
  }
}

/**
 * Rule: Check for sale of buyer's property contingency
 */
export class SaleContingencyRule extends BaseRule {
  constructor() {
    super(
      'CONT_SALE',
      'Sale Contingency Check',
      'Identifies if contract is contingent on sale of buyer\'s property',
      'contingency',
      { severity: 'medium' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const hasSaleContingency = this.containsKeywords(text, CONTINGENCY_KEYWORDS.sale);

    if (hasSaleContingency) {
      // This is a risk flag for sellers
      const flags = [
        this.createFlag(
          'PRESENT',
          'Contract is contingent on sale of buyer\'s property',
          'medium'
        ),
      ];

      // Check for kick-out clause
      const hasKickOut = text.includes('kick-out') ||
        text.includes('kick out') ||
        text.includes('72 hour') ||
        text.includes('bump clause') ||
        text.includes('right to continue marketing');

      if (!hasKickOut) {
        flags.push(
          this.createFlag(
            'NO_KICKOUT',
            'No kick-out clause found for sale contingency',
            'high'
          )
        );
        return this.fail(
          flags,
          'Sale contingency present without seller protection (kick-out clause)',
          ['Consider adding a kick-out clause to allow seller to continue marketing']
        );
      }

      return this.fail(
        flags,
        'Sale contingency present with kick-out clause protection'
      );
    }

    return this.pass('No sale of property contingency present');
  }
}

/**
 * Rule: Check for contingency removal deadlines
 */
export class ContingencyRemovalRule extends BaseRule {
  constructor() {
    super(
      'CONT_REMOVAL',
      'Contingency Removal Deadlines',
      'Verifies that contingency removal deadlines are clearly specified',
      'contingency',
      { severity: 'medium' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const removalMatches = text.match(TIMELINE_PATTERNS.removal);

    if (!removalMatches || removalMatches.length === 0) {
      return this.fail(
        [this.createFlag('NO_DEADLINES', 'No contingency removal deadlines found')],
        'Contract should specify when contingencies must be removed',
        ['Add specific dates or day counts for contingency removal']
      );
    }

    // Check for active vs passive removal
    const hasActiveRemoval = text.includes('written removal') ||
      text.includes('written notice') ||
      text.includes('affirmatively remove');

    const hasPassiveRemoval = text.includes('deemed removed') ||
      text.includes('automatically removed') ||
      text.includes('passive removal');

    if (hasPassiveRemoval && !hasActiveRemoval) {
      return this.fail(
        [this.createFlag('PASSIVE', 'Contract uses passive contingency removal', 'medium')],
        'Passive contingency removal may not adequately protect buyer',
        ['Consider requiring active written removal of contingencies']
      );
    }

    return this.pass('Contingency removal deadlines are specified');
  }
}

/**
 * Rule: Check for adequate number of contingencies
 */
export class ContingencyCoverageRule extends BaseRule {
  private readonly essentialContingencies = [
    { name: 'Financing', keywords: CONTINGENCY_KEYWORDS.financing },
    { name: 'Inspection', keywords: CONTINGENCY_KEYWORDS.inspection },
    { name: 'Appraisal', keywords: CONTINGENCY_KEYWORDS.appraisal },
    { name: 'Title', keywords: CONTINGENCY_KEYWORDS.title },
  ];

  constructor() {
    super(
      'CONT_COVERAGE',
      'Contingency Coverage Check',
      'Verifies that all essential contingencies are present',
      'contingency',
      { severity: 'high' }
    );
  }

  evaluate(context: RuleContext): RuleResult {
    const text = context.contractText?.toLowerCase() || '';
    const missing: string[] = [];

    for (const contingency of this.essentialContingencies) {
      if (!this.containsKeywords(text, contingency.keywords)) {
        missing.push(contingency.name);
      }
    }

    if (missing.length === 0) {
      return this.pass('All essential contingencies are present');
    }

    if (missing.length >= 3) {
      return this.fail(
        [this.createFlag('CRITICAL_GAPS', `Missing ${missing.length} essential contingencies`, 'critical')],
        `Contract is missing: ${missing.join(', ')}`,
        missing.map(m => `Add ${m.toLowerCase()} contingency`)
      );
    }

    return this.fail(
      [this.createFlag('GAPS', `Missing contingencies: ${missing.join(', ')}`)],
      `Contract may be missing important contingencies: ${missing.join(', ')}`,
      missing.map(m => `Consider adding ${m.toLowerCase()} contingency`)
    );
  }
}

/**
 * Create and configure all contingency rules
 */
export function createContingencyRules(): BaseRule[] {
  return [
    new FinancingContingencyRule(),
    new InspectionContingencyRule(),
    new AppraisalContingencyRule(),
    new TitleContingencyRule(),
    new SaleContingencyRule(),
    new ContingencyRemovalRule(),
    new ContingencyCoverageRule(),
  ];
}

/**
 * Create a rule engine with all contingency rules registered
 */
export function createContingencyRuleEngine(): RuleEngine {
  const engine = new RuleEngine();
  engine.registerAll(createContingencyRules());
  return engine;
}
