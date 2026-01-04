// State rules routes: State-specific rules management endpoints
import { Router } from 'express';
import * as stateRulesController from '../controllers/stateRules.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * GET /state-rules/states
 * Get all supported states
 */
router.get('/states', authenticate, stateRulesController.getSupportedStates);

/**
 * GET /state-rules/available
 * Get all available states with names
 */
router.get('/available', authenticate, stateRulesController.getAvailableStates);

/**
 * GET /state-rules/:state/supported
 * Check if a state is supported
 */
router.get('/:state/supported', authenticate, stateRulesController.isStateSupported);

/**
 * GET /state-rules/:state/name
 * Get state name by code
 */
router.get('/:state/name', authenticate, stateRulesController.getStateName);

/**
 * GET /state-rules/:state/requirements
 * Get state requirements
 */
router.get('/:state/requirements', authenticate, stateRulesController.getStateRequirements);

/**
 * POST /state-rules/:contractId/apply
 * Apply state-specific rules to a contract
 */
router.post('/:contractId/apply', authenticate, stateRulesController.applyStateRules);

/**
 * POST /state-rules/:contractId/validate
 * Validate state compliance for a contract
 */
router.post('/:contractId/validate', authenticate, stateRulesController.validateStateCompliance);

/**
 * GET /state-rules/:contractId/compliance-report
 * Get state compliance report for a contract
 */
router.get('/:contractId/compliance-report', authenticate, stateRulesController.getStateComplianceReport);

export default router;
