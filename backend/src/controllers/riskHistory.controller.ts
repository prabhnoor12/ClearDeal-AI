import { Request, Response, NextFunction } from 'express';
import * as riskHistoryService from '../services/riskHistory.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get risk history for a contract
 */
export async function getRiskHistory(
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

    const history = await riskHistoryService.getRiskHistory(contractId);
    sendSuccess(res, history, 'Risk history retrieved');
  } catch (error) {
    logger.error('[RiskHistory] getRiskHistory error', error);
    next(error);
  }
}

/**
 * Add a risk history entry
 */
export async function addRiskHistoryEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { score } = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    if (!score) {
      sendError(res, 'Risk score is required', 400);
      return;
    }

    const entry = await riskHistoryService.addRiskHistoryEntry(contractId, score);
    sendSuccess(res, entry, 'Risk history entry added', undefined, 201);
  } catch (error) {
    logger.error('[RiskHistory] addRiskHistoryEntry error', error);
    next(error);
  }
}

/**
 * Get risk trend for a contract
 */
export async function getRiskTrend(
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

    const trend = await riskHistoryService.getRiskTrend(contractId);
    sendSuccess(res, trend, 'Risk trend retrieved');
  } catch (error) {
    logger.error('[RiskHistory] getRiskTrend error', error);
    next(error);
  }
}

/**
 * Get recent flag changes for a contract
 */
export async function getRecentFlagChanges(
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

    const changes = await riskHistoryService.getRecentFlagChanges(contractId);
    sendSuccess(res, changes, 'Recent flag changes retrieved');
  } catch (error) {
    logger.error('[RiskHistory] getRecentFlagChanges error', error);
    next(error);
  }
}

/**
 * Get average score over time
 */
export async function getAverageScoreOverTime(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { days } = req.query;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const daysNum = days ? parseInt(days as string, 10) : undefined;
    const averages = await riskHistoryService.getAverageScoreOverTime(contractId, daysNum);
    sendSuccess(res, averages, 'Average score over time retrieved');
  } catch (error) {
    logger.error('[RiskHistory] getAverageScoreOverTime error', error);
    next(error);
  }
}

/**
 * Get risk statistics for a contract
 */
export async function getRiskStatistics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { days } = req.query;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const daysNum = days ? parseInt(days as string, 10) : undefined;
    const statistics = await riskHistoryService.getRiskStatistics(contractId, daysNum);
    sendSuccess(res, statistics, 'Risk statistics retrieved');
  } catch (error) {
    logger.error('[RiskHistory] getRiskStatistics error', error);
    next(error);
  }
}

/**
 * Delete risk history for a contract
 */
export async function deleteRiskHistory(
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

    await riskHistoryService.deleteRiskHistory(contractId);
    sendSuccess(res, null, 'Risk history deleted');
  } catch (error) {
    logger.error('[RiskHistory] deleteRiskHistory error', error);
    next(error);
  }
}
