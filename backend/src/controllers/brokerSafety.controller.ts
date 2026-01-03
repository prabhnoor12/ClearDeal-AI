// Broker Safety controller: Focused endpoints for broker safety monitoring and risk management
import { Request, Response, NextFunction } from 'express';
import * as brokerSafetyService from '../services/brokerSafety.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

// ============================================================================
// Safety Status & Monitoring
// ============================================================================

/**
 * GET /broker-safety/status/:orgId
 * Get current safety status for a broker/organization
 */
export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }
    const status = await brokerSafetyService.getSafetyStatus(orgId);
    sendSuccess(res, status, 'Safety status retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getStatus error', error);
    next(error);
  }
}

/**
 * GET /broker-safety/analytics/:orgId
 * Get safety analytics for a broker/organization
 */
export async function getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }
    const analytics = await brokerSafetyService.getAnalytics(orgId);
    sendSuccess(res, analytics, 'Safety analytics retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getAnalytics error', error);
    next(error);
  }
}

/**
 * GET /broker-safety/trend/:orgId
 * Get safety trend over time for an organization
 */
export async function getTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    logger.error('[BrokerSafetyController] getTrend error', error);
    next(error);
  }
}

// ============================================================================
// Alerts & Flagging
// ============================================================================

/**
 * GET /broker-safety/alerts
 * Get all brokers with active safety alerts
 */
export async function getAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brokers = await brokerSafetyService.getBrokersWithAlerts();
    sendSuccess(res, brokers, 'Brokers with alerts retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getAlerts error', error);
    next(error);
  }
}

/**
 * POST /broker-safety/flag/:brokerId
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
    sendSuccess(res, { brokerId, flagged: true }, 'Broker flagged as risky');
  } catch (error) {
    logger.error('[BrokerSafetyController] flagBroker error', error);
    sendError(res, 'Failed to flag broker', 500, error);
  }
}

/**
 * DELETE /broker-safety/flag/:brokerId
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
    sendSuccess(res, { brokerId, flagged: false }, 'Broker unflagged');
  } catch (error) {
    logger.error('[BrokerSafetyController] unflagBroker error', error);
    sendError(res, 'Failed to unflag broker', 500, error);
  }
}

/**
 * GET /broker-safety/flagged
 * Get all manually flagged brokers
 */
export function getFlaggedBrokers(_req: Request, res: Response): void {
  try {
    const brokers = brokerSafetyService.getFlaggedBrokers();
    sendSuccess(res, brokers, 'Flagged brokers retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getFlaggedBrokers error', error);
    sendError(res, 'Failed to get flagged brokers', 500, error);
  }
}

// ============================================================================
// Activity & Audit
// ============================================================================

/**
 * POST /broker-safety/activity
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
    logger.error('[BrokerSafetyController] logActivity error', error);
    next(error);
  }
}

/**
 * GET /broker-safety/activity/:brokerId
 * Get recent activity for a broker
 */
export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brokerId } = req.params;
    const limit = parseInt(req.query['limit'] as string, 10) || 50;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    const activities = await brokerSafetyService.getRecentActivity(brokerId, limit);
    sendSuccess(res, activities, 'Activity retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getActivity error', error);
    next(error);
  }
}

/**
 * GET /broker-safety/export/:brokerId
 * Export broker activity as CSV
 */
export async function exportActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brokerId } = req.params;
    const limit = parseInt(req.query['limit'] as string, 10) || 50;
    if (!brokerId) {
      sendError(res, 'brokerId is required', 400);
      return;
    }
    const csv = await brokerSafetyService.exportActivityCSV(brokerId, limit);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=broker_${brokerId}_safety_activity.csv`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('[BrokerSafetyController] exportActivity error', error);
    next(error);
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * POST /broker-safety/cache/clear
 * Clear safety status cache (admin only)
 */
export function clearCache(_req: Request, res: Response): void {
  try {
    brokerSafetyService.clearSafetyCache();
    sendSuccess(res, null, 'Safety cache cleared');
  } catch (error) {
    logger.error('[BrokerSafetyController] clearCache error', error);
    sendError(res, 'Failed to clear cache', 500, error);
  }
}

// ============================================================================
// Dashboard Summary
// ============================================================================

/**
 * GET /broker-safety/dashboard/:orgId
 * Get comprehensive safety dashboard data for an organization
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'orgId is required', 400);
      return;
    }

    // Gather all safety data for dashboard
    const [status, analytics, trend, flaggedBrokers] = await Promise.all([
      brokerSafetyService.getSafetyStatus(orgId),
      brokerSafetyService.getAnalytics(orgId),
      brokerSafetyService.getSafetyTrend(orgId, 6),
      Promise.resolve(brokerSafetyService.getFlaggedBrokers()),
    ]);

    const dashboard = {
      status,
      analytics,
      trend,
      flaggedCount: flaggedBrokers.length,
      lastUpdated: new Date().toISOString(),
    };

    sendSuccess(res, dashboard, 'Safety dashboard retrieved');
  } catch (error) {
    logger.error('[BrokerSafetyController] getDashboard error', error);
    next(error);
  }
}
