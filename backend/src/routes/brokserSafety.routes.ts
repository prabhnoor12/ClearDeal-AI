// Broker Safety routes: Safety monitoring, alerts, flagging, and activity endpoints
import { Router } from 'express';
import * as brokerSafetyController from '../controllers/brokerSafety.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All broker safety routes require authentication
router.use(authenticate);

// ============================================================================
// Safety Status & Monitoring
// ============================================================================

/**
 * GET /broker-safety/status/:orgId
 * Get current safety status for a broker/organization
 */
router.get('/status/:orgId', brokerSafetyController.getStatus);

/**
 * GET /broker-safety/analytics/:orgId
 * Get safety analytics for a broker/organization
 */
router.get('/analytics/:orgId', brokerSafetyController.getAnalytics);

/**
 * GET /broker-safety/trend/:orgId
 * Get safety trend over time for an organization
 */
router.get('/trend/:orgId', brokerSafetyController.getTrend);

// ============================================================================
// Dashboard
// ============================================================================

/**
 * GET /broker-safety/dashboard/:orgId
 * Get comprehensive safety dashboard data for an organization
 */
router.get('/dashboard/:orgId', brokerSafetyController.getDashboard);

// ============================================================================
// Alerts & Flagging
// ============================================================================

/**
 * GET /broker-safety/alerts
 * Get all brokers with active safety alerts
 */
router.get('/alerts', brokerSafetyController.getAlerts);

/**
 * POST /broker-safety/flag/:brokerId
 * Manually flag a broker as risky
 */
router.post('/flag/:brokerId', brokerSafetyController.flagBroker);

/**
 * DELETE /broker-safety/flag/:brokerId
 * Remove manual flag from a broker
 */
router.delete('/flag/:brokerId', brokerSafetyController.unflagBroker);

/**
 * GET /broker-safety/flagged
 * Get all manually flagged brokers
 */
router.get('/flagged', brokerSafetyController.getFlaggedBrokers);

// ============================================================================
// Activity & Audit
// ============================================================================

/**
 * POST /broker-safety/activity
 * Log a broker activity event
 */
router.post('/activity', brokerSafetyController.logActivity);

/**
 * GET /broker-safety/activity/:brokerId
 * Get recent activity for a broker
 */
router.get('/activity/:brokerId', brokerSafetyController.getActivity);

/**
 * GET /broker-safety/export/:brokerId
 * Export broker activity as CSV
 */
router.get('/export/:brokerId', brokerSafetyController.exportActivity);

// ============================================================================
// Cache Management (Admin only)
// ============================================================================

/**
 * POST /broker-safety/cache/clear
 * Clear safety status cache (admin only)
 */
router.post('/cache/clear', authorize('admin'), brokerSafetyController.clearCache);

export default router;
