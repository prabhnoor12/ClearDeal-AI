// Notification routes: Notification management endpoints
import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * GET /notifications/:orgId
 * Get notifications for an organization
 */
router.get('/:orgId', authenticate, notificationController.getNotifications);

/**
 * POST /notifications/:orgId
 * Create a notification for an organization
 */
router.post('/:orgId', authenticate, notificationController.createNotification);

/**
 * GET /notifications/:orgId/unread-count
 * Get unread notification count for an organization
 */
router.get('/:orgId/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * GET /notifications/:orgId/search
 * Search notifications for an organization
 */
router.get('/:orgId/search', authenticate, notificationController.searchNotifications);

/**
 * POST /notifications/:orgId/mark-all-read
 * Mark all notifications as read for an organization
 */
router.post('/:orgId/mark-all-read', authenticate, notificationController.markAllAsRead);

/**
 * POST /notifications/:orgId/schedule
 * Schedule a notification for an organization
 */
router.post('/:orgId/schedule', authenticate, notificationController.scheduleNotification);

/**
 * PATCH /notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', authenticate, notificationController.markAsRead);

/**
 * POST /notifications/cleanup
 * Remove expired notifications
 */
router.post('/cleanup', authenticate, notificationController.removeExpired);

export default router;
