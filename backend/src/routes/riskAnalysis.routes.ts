// Risk analysis routes: Risk analysis endpoints
import { Router } from 'express';
import * as riskAnalysisController from '../controllers/riskAnalysis.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * POST /risk-analysis/batch
 * Analyze risk for multiple contracts
 */
router.post('/batch', authenticate, riskAnalysisController.analyzeRiskBatch);

/**
 * POST /risk-analysis/:contractId/analyze
 * Analyze risk for a contract
 */
router.post('/:contractId/analyze', authenticate, riskAnalysisController.analyzeRisk);

/**
 * GET /risk-analysis/:contractId
 * Get existing risk analysis for a contract
 */
router.get('/:contractId', authenticate, riskAnalysisController.getRiskAnalysis);

/**
 * GET /risk-analysis/:contractId/recommendations
 * Get recommendations for a contract
 */
router.get('/:contractId/recommendations', authenticate, riskAnalysisController.getRecommendations);

/**
 * GET /risk-analysis/:contractId/trend
 * Get risk trend for a contract
 */
router.get('/:contractId/trend', authenticate, riskAnalysisController.getRiskTrend);

export default router;
