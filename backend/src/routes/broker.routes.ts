// Broker routes: Safety, analytics, activity, and flagging endpoints
import { Router } from 'express';
import * as brokerController from '../controllers/broker.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All broker routes require authentication
router.use(authenticate);

// ============================================================================
// Safety Status
// ============================================================================

/**
 * GET /broker/safety/:orgId
 * Get safety status for a broker/organization
 */
router.get('/safety/:orgId', brokerController.getSafetyStatus);

// ============================================================================
// Analytics
// ============================================================================

/**
 * GET /broker/analytics/:orgId
 * Get analytics for a broker/organization
 */
router.get('/analytics/:orgId', brokerController.getAnalytics);

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * POST /broker/activity
 * Log a broker activity event
 */
router.post('/activity', brokerController.logActivity);

/**
 * GET /broker/activity/:brokerId
 * Get recent activity for a broker
 */
router.get('/activity/:brokerId', brokerController.getRecentActivity);

// ============================================================================
// Alerts
// ============================================================================

/**
 * GET /broker/alerts
 * Get all brokers with active alerts
 */
router.get('/alerts', brokerController.getBrokersWithAlerts);

// ============================================================================
// Manual Flagging
// ============================================================================

/**
 * POST /broker/flag/:brokerId
 * Manually flag a broker as risky
 */
router.post('/flag/:brokerId', brokerController.flagBroker);

/**
 * DELETE /broker/flag/:brokerId
 * Remove manual flag from a broker
 */
router.delete('/flag/:brokerId', brokerController.unflagBroker);

/**
 * GET /broker/flagged
 * Get all manually flagged brokers
 */
router.get('/flagged', brokerController.getFlaggedBrokers);

// ============================================================================
// Trends & Export
// ============================================================================

/**
 * GET /broker/trend/:orgId
 * Get safety trend for an organization
 */
router.get('/trend/:orgId', brokerController.getSafetyTrend);

/**
 * GET /broker/export/:brokerId
 * Export recent broker activity as CSV
 */
router.get('/export/:brokerId', brokerController.exportActivityCSV);

// ============================================================================
// Cache Management (Admin only)
// ============================================================================

/**
 * POST /broker/cache/clear
 * Clear the safety status cache (admin only)
 */
router.post('/cache/clear', authorize('admin'), brokerController.clearSafetyCache);

export default router;
