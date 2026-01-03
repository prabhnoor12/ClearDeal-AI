import { Request, Response, NextFunction } from 'express';
import * as stateRulesService from '../services/stateRules.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get all supported states
 */
export async function getSupportedStates(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const states = stateRulesService.getSupportedStates();
    sendSuccess(res, states, 'Supported states retrieved');
  } catch (error) {
    logger.error('[StateRules] getSupportedStates error', error);
    next(error);
  }
}

/**
 * Check if a state is supported
 */
export async function isStateSupported(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { state } = req.params;

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const isSupported = stateRulesService.isStateSupported(state);
    sendSuccess(res, { state, isSupported }, 'State support checked');
  } catch (error) {
    logger.error('[StateRules] isStateSupported error', error);
    next(error);
  }
}

/**
 * Get state name by code
 */
export async function getStateName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { state } = req.params;

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const name = stateRulesService.getStateName(state);

    if (!name) {
      sendError(res, 'State not found', 404);
      return;
    }

    sendSuccess(res, { state, name }, 'State name retrieved');
  } catch (error) {
    logger.error('[StateRules] getStateName error', error);
    next(error);
  }
}

/**
 * Get all available states with names
 */
export async function getAvailableStates(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const states = stateRulesService.getAvailableStates();
    sendSuccess(res, states, 'Available states retrieved');
  } catch (error) {
    logger.error('[StateRules] getAvailableStates error', error);
    next(error);
  }
}

/**
 * Apply state-specific rules to a contract
 */
export async function applyStateRules(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { state } = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const flags = await stateRulesService.applyStateRules(contractId, state);
    sendSuccess(res, flags, 'State rules applied');
  } catch (error) {
    logger.error('[StateRules] applyStateRules error', error);
    next(error);
  }
}

/**
 * Get state requirements
 */
export async function getStateRequirements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { state } = req.params;

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const requirements = await stateRulesService.getStateRequirements(state);
    sendSuccess(res, requirements, 'State requirements retrieved');
  } catch (error) {
    logger.error('[StateRules] getStateRequirements error', error);
    next(error);
  }
}

/**
 * Validate state compliance for a contract
 */
export async function validateStateCompliance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { state } = req.body;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const result = await stateRulesService.validateStateCompliance(contractId, state);
    sendSuccess(res, result, 'State compliance validated');
  } catch (error) {
    logger.error('[StateRules] validateStateCompliance error', error);
    next(error);
  }
}

/**
 * Get state compliance report for a contract
 */
export async function getStateComplianceReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contractId } = req.params;
    const { state } = req.query;

    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    if (!state) {
      sendError(res, 'State code is required', 400);
      return;
    }

    const report = await stateRulesService.getStateComplianceReport(contractId, state as string);
    sendSuccess(res, report, 'State compliance report generated');
  } catch (error) {
    logger.error('[StateRules] getStateComplianceReport error', error);
    next(error);
  }
}
