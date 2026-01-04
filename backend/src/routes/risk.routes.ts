// Risk routes: Risk management endpoints
import { Router } from 'express';
import * as riskController from '../controllers/risk.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * POST /risk/summaries
 * Get risk summaries for multiple contracts
 */
router.post('/summaries', authenticate, riskController.getRiskSummaries);

/**
 * POST /risk/high-risk
 * Get high-risk contracts from a list
 */
router.post('/high-risk', authenticate, riskController.getHighRiskContracts);

/**
 * GET /risk/:contractId/overview
 * Get comprehensive risk overview for a contract
 */
router.get('/:contractId/overview', authenticate, riskController.getRiskOverview);

/**
 * GET /risk/:contractId/summary
 * Get risk summary for a contract
 */
router.get('/:contractId/summary', authenticate, riskController.getRiskSummary);

/**
 * GET /risk/:contractId/flags
 * Get risk flags for a contract
 */
router.get('/:contractId/flags', authenticate, riskController.getRiskFlags);

/**
 * POST /risk/:contractId/assess
 * Perform full risk assessment on a contract
 */
router.post('/:contractId/assess', authenticate, riskController.assessRisk);

/**
 * DELETE /risk/:contractId
 * Clear all risk data for a contract
 */
router.delete('/:contractId', authenticate, riskController.clearRiskData);

export default router;
