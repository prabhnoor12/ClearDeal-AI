// Broker controller: Handles broker safety, analytics, and activity HTTP requests
import { Request, Response, NextFunction } from 'express';
import * as brokerSafetyService from '../services/brokerSafety.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

// ============================================================================
// Safety Status
// ============================================================================

/**
 * GET /broker/safety/:orgId
 * Get safety status for a broker/organization
 */
export async function getSafetyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }
    const status = await brokerSafetyService.getSafetyStatus(orgId);
    sendSuccess(res, status, 'Safety status retrieved');
  } catch (error) {
    logger.error('[BrokerController] getSafetyStatus error', error);
    next(error);
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * GET /broker/analytics/:orgId
 * Get analytics for a broker/organization
 */
export async function getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }
    const analytics = await brokerSafetyService.getAnalytics(orgId);
    sendSuccess(res, analytics, 'Analytics retrieved');
  } catch (error) {
    logger.error('[BrokerController] getAnalytics error', error);
    next(error);
  }
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * POST /broker/activity
 * Log a broker activity event
 */
export async function logActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brokerId, orgId, route, metadata } = req.body;
    if (!brokerId || !orgId || !route) {
      sendError(res, 'brokerId, orgId, and route are required', 400);
      return;
    }
    await brokerSafetyService.logActivity({ brokerId, orgId, route, timestamp: new Date(), metadata });
    sendSuccess(res, null, 'Activity logged', undefined, 201);
  } catch (error) {
    logger.error('[BrokerController] logActivity error', error);
    next(error);
  }
}

/**
 * GET /broker/activity/:brokerId
 * Get recent activity for a broker
 */
export async function getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brokerId } = req.params;
    const limit = parseInt(req.query['limit'] as string, 10) || 50;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    const activities = await brokerSafetyService.getRecentActivity(brokerId, limit);
    sendSuccess(res, activities, 'Recent activity retrieved');
  } catch (error) {
    logger.error('[BrokerController] getRecentActivity error', error);
    next(error);
  }
}

// ============================================================================
// Alerts
// ============================================================================

/**
 * GET /broker/alerts
 * Get all brokers with active alerts
 */
export async function getBrokersWithAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brokers = await brokerSafetyService.getBrokersWithAlerts();
    sendSuccess(res, brokers, 'Brokers with alerts retrieved');
  } catch (error) {
    logger.error('[BrokerController] getBrokersWithAlerts error', error);
    next(error);
  }
}

// ============================================================================
// Manual Flagging
// ============================================================================

/**
 * POST /broker/flag/:brokerId
 * Manually flag a broker as risky
 */
export function flagBroker(req: Request, res: Response): void {
  try {
    const { brokerId } = req.params;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    brokerSafetyService.flagBroker(brokerId);
    sendSuccess(res, { brokerId }, 'Broker flagged');
  } catch (error) {
    logger.error('[BrokerController] flagBroker error', error);
    sendError(res, 'Failed to flag broker', 500, error);
  }
}

/**
 * DELETE /broker/flag/:brokerId
 * Remove manual flag from a broker
 */
export function unflagBroker(req: Request, res: Response): void {
  try {
    const { brokerId } = req.params;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    brokerSafetyService.unflagBroker(brokerId);
    sendSuccess(res, { brokerId }, 'Broker unflagged');
  } catch (error) {
    logger.error('[BrokerController] unflagBroker error', error);
    sendError(res, 'Failed to unflag broker', 500, error);
  }
}

/**
 * GET /broker/flagged
 * Get all manually flagged brokers
 */
export function getFlaggedBrokers(_req: Request, res: Response): void {
  try {
    const brokers = brokerSafetyService.getFlaggedBrokers();
    sendSuccess(res, brokers, 'Flagged brokers retrieved');
  } catch (error) {
    logger.error('[BrokerController] getFlaggedBrokers error', error);
    sendError(res, 'Failed to get flagged brokers', 500, error);
  }
}

// ============================================================================
// Trends & Export
// ============================================================================

/**
 * GET /broker/trend/:orgId
 * Get safety trend for an organization
 */
export async function getSafetyTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    const months = parseInt(req.query['months'] as string, 10) || 6;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }
    const trend = await brokerSafetyService.getSafetyTrend(orgId, months);
    sendSuccess(res, trend, 'Safety trend retrieved');
  } catch (error) {
    logger.error('[BrokerController] getSafetyTrend error', error);
    next(error);
  }
}

/**
 * GET /broker/export/:brokerId
 * Export recent broker activity as CSV
 */
export async function exportActivityCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brokerId } = req.params;
    const limit = parseInt(req.query['limit'] as string, 10) || 50;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    const csv = await brokerSafetyService.exportActivityCSV(brokerId, limit);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=broker_${brokerId}_activity.csv`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('[BrokerController] exportActivityCSV error', error);
    next(error);
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * POST /broker/cache/clear
 * Clear the safety status cache (admin only)
 */
export function clearSafetyCache(_req: Request, res: Response): void {
  try {
    brokerSafetyService.clearSafetyCache();
    sendSuccess(res, null, 'Safety cache cleared');
  } catch (error) {
    logger.error('[BrokerController] clearSafetyCache error', error);
    sendError(res, 'Failed to clear cache', 500, error);
  }
}
