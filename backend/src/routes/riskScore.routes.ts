// Risk score routes: Risk score management endpoints
import { Router } from 'express';
import * as riskScoreController from '../controllers/riskScore.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * POST /risk-scores
 * Add a risk score
 */
router.post('/', authenticate, riskScoreController.addRiskScore);

/**
 * POST /risk-scores/batch
 * Get risk scores for multiple contracts
 */
router.post('/batch', authenticate, riskScoreController.getRiskScoresForContracts);

/**
 * GET /risk-scores/:contractId
 * Get risk score for a contract
 */
router.get('/:contractId', authenticate, riskScoreController.getRiskScore);

/**
 * POST /risk-scores/:contractId/calculate
 * Calculate and save risk score for a contract
 */
router.post('/:contractId/calculate', authenticate, riskScoreController.calculateAndSaveRiskScore);

/**
 * PUT /risk-scores/:contractId
 * Update a risk score
 */
router.put('/:contractId', authenticate, riskScoreController.updateRiskScore);

/**
 * DELETE /risk-scores/:contractId
 * Delete risk score for a contract
 */
router.delete('/:contractId', authenticate, riskScoreController.deleteRiskScore);

export default router;
