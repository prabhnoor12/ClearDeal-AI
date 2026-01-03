import { Request, Response, NextFunction } from 'express';
import * as riskService from '../services/risk.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get comprehensive risk overview for a contract
 */
export async function getRiskOverview(
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

    const overview = await riskService.getRiskOverview(contractId);
    sendSuccess(res, overview, 'Risk overview retrieved');
  } catch (error) {
    logger.error('[Risk] getRiskOverview error', error);
    next(error);
  }
}

/**
 * Get risk summary for a contract
 */
export async function getRiskSummary(
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

    const summary = await riskService.getRiskSummary(contractId);
    sendSuccess(res, summary, 'Risk summary retrieved');
  } catch (error) {
    logger.error('[Risk] getRiskSummary error', error);
    next(error);
  }
}

/**
 * Get risk summaries for multiple contracts
 */
export async function getRiskSummaries(
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

    const summaries = await riskService.getRiskSummaries(contractIds);
    sendSuccess(res, summaries, 'Risk summaries retrieved');
  } catch (error) {
    logger.error('[Risk] getRiskSummaries error', error);
    next(error);
  }
}

/**
 * Perform full risk assessment on a contract
 */
export async function assessRisk(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { skipAI, forceRefresh } = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const analysis = await riskService.assessRisk(contractId, { skipAI, forceRefresh });
    sendSuccess(res, analysis, 'Risk assessment completed');
  } catch (error) {
    logger.error('[Risk] assessRisk error', error);
    next(error);
  }
}

/**
 * Get high-risk contracts from a list
 */
export async function getHighRiskContracts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractIds, threshold } = req.body;

    if (!contractIds || !Array.isArray(contractIds)) {
      sendError(res, 'Contract IDs array is required', 400);
      return;
    }

    const highRisk = await riskService.getHighRiskContracts(contractIds, threshold);
    sendSuccess(res, highRisk, 'High-risk contracts retrieved');
  } catch (error) {
    logger.error('[Risk] getHighRiskContracts error', error);
    next(error);
  }
}

/**
 * Get risk flags for a contract
 */
export async function getRiskFlags(
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

    const flags = await riskService.getRiskFlags(contractId);
    sendSuccess(res, flags, 'Risk flags retrieved');
  } catch (error) {
    logger.error('[Risk] getRiskFlags error', error);
    next(error);
  }
}

/**
 * Clear all risk data for a contract
 */
export async function clearRiskData(
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

    await riskService.clearRiskData(contractId);
    sendSuccess(res, null, 'Risk data cleared');
  } catch (error) {
    logger.error('[Risk] clearRiskData error', error);
    next(error);
  }
}
