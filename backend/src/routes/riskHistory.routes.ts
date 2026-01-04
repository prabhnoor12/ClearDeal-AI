// Risk history routes: Risk history management endpoints
import { Router } from 'express';
import * as riskHistoryController from '../controllers/riskHistory.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * GET /risk-history/:contractId
 * Get risk history for a contract
 */
router.get('/:contractId', authenticate, riskHistoryController.getRiskHistory);

/**
 * POST /risk-history/:contractId
 * Add a risk history entry
 */
router.post('/:contractId', authenticate, riskHistoryController.addRiskHistoryEntry);

/**
 * GET /risk-history/:contractId/trend
 * Get risk trend for a contract
 */
router.get('/:contractId/trend', authenticate, riskHistoryController.getRiskTrend);

/**
 * GET /risk-history/:contractId/flag-changes
 * Get recent flag changes for a contract
 */
router.get('/:contractId/flag-changes', authenticate, riskHistoryController.getRecentFlagChanges);

/**
 * GET /risk-history/:contractId/average
 * Get average score over time
 */
router.get('/:contractId/average', authenticate, riskHistoryController.getAverageScoreOverTime);

/**
 * GET /risk-history/:contractId/statistics
 * Get risk statistics for a contract
 */
router.get('/:contractId/statistics', authenticate, riskHistoryController.getRiskStatistics);

/**
 * DELETE /risk-history/:contractId
 * Delete risk history for a contract
 */
router.delete('/:contractId', authenticate, riskHistoryController.deleteRiskHistory);

export default router;
