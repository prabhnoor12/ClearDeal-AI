// Notification controller: Handles notification endpoints
import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * GET /notifications/:orgId
 * Get notifications for an organization
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const notifications = await notificationService.getBrokerNotifications(orgId);
    sendSuccess(res, notifications, 'Notifications retrieved');
  } catch (error) {
    logger.error('[NotificationController] getNotifications error', error);
    next(error);
  }
}

/**
 * POST /notifications/:orgId
 * Create a notification for an organization
 */
export async function createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    const { message, type } = req.body;
    if (!orgId || !message) {
      sendError(res, 'Organization ID and message are required', 400);
      return;
    }
    const notification = await notificationService.createBrokerNotification(orgId, message, type);
    sendSuccess(res, notification, 'Notification created', undefined, 201);
  } catch (error) {
    logger.error('[NotificationController] createNotification error', error);
    next(error);
  }
}

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Notification ID is required', 400);
      return;
    }
    const success = await notificationService.markNotificationAsRead(parseInt(id, 10));
    if (!success) {
      sendError(res, 'Notification not found', 404);
      return;
    }
    sendSuccess(res, { id }, 'Notification marked as read');
  } catch (error) {
    logger.error('[NotificationController] markAsRead error', error);
    next(error);
  }
}

/**
 * GET /notifications/:orgId/unread-count
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const count = await notificationService.getUnreadCount(orgId);
    sendSuccess(res, { count }, 'Unread count retrieved');
  } catch (error) {
    logger.error('[NotificationController] getUnreadCount error', error);
    next(error);
  }
}

/**
 * POST /notifications/:orgId/mark-all-read
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const count = await notificationService.markAllAsRead(orgId);
    sendSuccess(res, { markedCount: count }, 'All notifications marked as read');
  } catch (error) {
    logger.error('[NotificationController] markAllAsRead error', error);
    next(error);
  }
}

/**
 * POST /notifications/:orgId/schedule
 * Schedule a notification
 */
export function scheduleNotification(req: Request, res: Response): void {
  try {
    const { orgId } = req.params;
    const { message, type, category, scheduledFor, priority, expiresAt } = req.body;
    if (!orgId || !message || !scheduledFor) {
      sendError(res, 'Organization ID, message, and scheduledFor are required', 400);
      return;
    }
    const notification = notificationService.scheduleNotification(
      orgId, message, type, category, scheduledFor, priority, expiresAt
    );
    sendSuccess(res, notification, 'Notification scheduled', undefined, 201);
  } catch (error) {
    logger.error('[NotificationController] scheduleNotification error', error);
    sendError(res, 'Failed to schedule notification', 500, error);
  }
}

/**
 * GET /notifications/:orgId/search
 * Search notifications
 */
export function searchNotifications(req: Request, res: Response): void {
  try {
    const { orgId } = req.params;
    const query = req.query['q'] as string || '';
    const typeParam = req.query['type'] as string | undefined;
    const categoryParam = req.query['category'] as string | undefined;
    if (!orgId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const options: { type?: 'alert' | 'info' | 'warning'; category?: notificationService.NotificationCategory } = {};
    if (typeParam === 'alert' || typeParam === 'info' || typeParam === 'warning') {
      options.type = typeParam;
    }
    if (categoryParam) {
      options.category = categoryParam as notificationService.NotificationCategory;
    }
    const results = notificationService.searchNotifications(orgId, query, options);
    sendSuccess(res, results, 'Search results');
  } catch (error) {
    logger.error('[NotificationController] searchNotifications error', error);
    sendError(res, 'Failed to search notifications', 500, error);
  }
}

/**
 * POST /notifications/cleanup
 * Remove expired notifications
 */
export function removeExpired(_req: Request, res: Response): void {
  try {
    const removed = notificationService.removeExpiredNotifications();
    sendSuccess(res, { removed }, 'Expired notifications removed');
  } catch (error) {
    logger.error('[NotificationController] removeExpired error', error);
    sendError(res, 'Failed to remove expired notifications', 500, error);
  }
}
