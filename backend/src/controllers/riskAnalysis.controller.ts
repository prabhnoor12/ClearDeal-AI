// Risk analysis controller: Handles risk analysis HTTP requests
import { Request, Response, NextFunction } from 'express';
import * as riskAnalysisService from '../services/riskAnalysis.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * POST /risk/analyze/:contractId
 * Analyze risk for a contract
 */
export async function analyzeRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    const { skipAI, forceRefresh, cacheTTL } = req.body;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const analysis = await riskAnalysisService.analyzeRisk(contractId, { skipAI, forceRefresh, cacheTTL });
    sendSuccess(res, analysis, 'Risk analysis completed');
  } catch (error) {
    logger.error('[RiskAnalysisController] analyzeRisk error', error);
    next(error);
  }
}

/**
 * GET /risk/:contractId
 * Get existing risk analysis for a contract
 */
export async function getRiskAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const analysis = await riskAnalysisService.getRiskAnalysis(contractId);
    if (!analysis) {
      sendError(res, 'Risk analysis not found', 404);
      return;
    }
    sendSuccess(res, analysis, 'Risk analysis retrieved');
  } catch (error) {
    logger.error('[RiskAnalysisController] getRiskAnalysis error', error);
    next(error);
  }
}

/**
 * GET /risk/recommendations/:contractId
 * Get recommendations for a contract
 */
export async function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const recommendations = await riskAnalysisService.getRecommendations(contractId);
    sendSuccess(res, recommendations, 'Recommendations retrieved');
  } catch (error) {
    logger.error('[RiskAnalysisController] getRecommendations error', error);
    next(error);
  }
}

/**
 * GET /risk/trend/:contractId
 * Get risk trend for a contract
 */
export async function getRiskTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const trend = await riskAnalysisService.getRiskTrend(contractId);
    sendSuccess(res, trend, 'Risk trend retrieved');
  } catch (error) {
    logger.error('[RiskAnalysisController] getRiskTrend error', error);
    next(error);
  }
}

/**
 * POST /risk/batch
 * Analyze risk for multiple contracts
 */
export async function analyzeRiskBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractIds, options } = req.body;
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      sendError(res, 'Contract IDs array is required', 400);
      return;
    }
    const results = await riskAnalysisService.analyzeRiskBatch(contractIds, options);
    sendSuccess(res, results, 'Batch analysis completed');
  } catch (error) {
    logger.error('[RiskAnalysisController] analyzeRiskBatch error', error);
    next(error);
  }
}
