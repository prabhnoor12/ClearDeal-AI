import { Request, Response, NextFunction } from 'express';
import * as riskScoreService from '../services/riskScore.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get risk score for a contract
 */
export async function getRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const score = await riskScoreService.getRiskScore(contractId);
    sendSuccess(res, score, 'Risk score retrieved');
  } catch (error) {
    logger.error('[RiskScore] getRiskScore error', error);
    next(error);
  }
}

/**
 * Calculate and save risk score for a contract
 */
export async function calculateAndSaveRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { flags } = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const score = await riskScoreService.calculateAndSaveRiskScore(contractId, flags);
    sendSuccess(res, score, 'Risk score calculated and saved', undefined, 201);
  } catch (error) {
    logger.error('[RiskScore] calculateAndSaveRiskScore error', error);
    next(error);
  }
}

/**
 * Add a risk score
 */
export async function addRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { score } = req.body;

    if (!score) {
      sendError(res, 'Risk score data is required', 400);
      return;
    }

    const savedScore = await riskScoreService.addRiskScore(score);
    sendSuccess(res, savedScore, 'Risk score added', undefined, 201);
  } catch (error) {
    logger.error('[RiskScore] addRiskScore error', error);
    next(error);
  }
}

/**
 * Update a risk score
 */
export async function updateRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const updates = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const updatedScore = await riskScoreService.updateRiskScore(contractId, updates);
    sendSuccess(res, updatedScore, 'Risk score updated');
  } catch (error) {
    logger.error('[RiskScore] updateRiskScore error', error);
    next(error);
  }
}

/**
 * Delete risk score for a contract
 */
export async function deleteRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    await riskScoreService.deleteRiskScore(contractId);
    sendSuccess(res, null, 'Risk score deleted');
  } catch (error) {
    logger.error('[RiskScore] deleteRiskScore error', error);
    next(error);
  }
}

/**
 * Get risk scores for multiple contracts
 */
export async function getRiskScoresForContracts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractIds } = req.body;

    if (!contractIds || !Array.isArray(contractIds)) {
      sendError(res, 'Contract IDs array is required', 400);
      return;
    }

    const scores = await riskScoreService.getRiskScoresForContracts(contractIds);
    sendSuccess(res, scores, 'Risk scores retrieved');
  } catch (error) {
    logger.error('[RiskScore] getRiskScoresForContracts error', error);
    next(error);
  }
}
