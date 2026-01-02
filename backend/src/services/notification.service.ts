// Notification service: handles admin, broker, and user notifications

import { logger } from '../utils/logger';


export interface NotificationPayload {
  type: string;
  error?: any;
  url?: string;
  method?: string;
  user?: any;
  timestamp: Date;
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
}


export interface BrokerNotification {
  id: number;
  orgId: string;
  message: string;
  type: 'alert' | 'info' | 'warning';
  read: boolean;
  createdAt: string;
}

// Store for notifications (in-memory for demo/testing)
const notificationStore: BrokerNotification[] = [];

// --- ORIGINAL NOTIFICATION FUNCTIONS ---

export function notifyAdmin(payload: NotificationPayload): void {
  const logMessage = `[ADMIN ALERT] Type: ${payload.type} | Severity: ${payload.severity || 'info'} | URL: ${payload.url || 'N/A'}`;

  if (payload.severity === 'critical') {
    logger.error(logMessage, payload);
    // TODO: Send email/Slack notification
  } else if (payload.severity === 'warning') {
    logger.warn(logMessage, payload);
  } else {
    logger.info(logMessage, payload);
  }

  console.log('ADMIN NOTIFY:', payload);
}

export async function getBrokerNotifications(orgId: string): Promise<BrokerNotification[]> {
  return notificationStore.filter((n: BrokerNotification) => n.orgId === orgId).slice(-50);
}

export async function createBrokerNotification(
  orgId: string,
  message: string,
  type: 'alert' | 'info' | 'warning' = 'info'
): Promise<BrokerNotification> {
  const notification: BrokerNotification = {
    id: notificationStore.length + 1,
    orgId,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notificationStore.push(notification);
  return notification;
}

export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const notification = notificationStore.find((n: BrokerNotification) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

export async function getUnreadCount(orgId: string): Promise<number> {
  return notificationStore.filter((n: BrokerNotification) => n.orgId === orgId && !n.read).length;
}

export async function markAllAsRead(orgId: string): Promise<number> {
  let count = 0;
  for (const n of notificationStore) {
    if ((n as BrokerNotification).orgId === orgId && !(n as BrokerNotification).read) {
      (n as BrokerNotification).read = true;
      count++;
    }
  }
  return count;
}

export type NotificationCategory = 'system' | 'billing' | 'compliance' | 'user' | 'custom';

export interface ExtendedNotification extends BrokerNotification {
  category: NotificationCategory;
  priority: number;
  expiresAt?: string | undefined;
}

const scheduledNotifications: Array<ExtendedNotification & { scheduledFor: string }> = [];

export function scheduleNotification(
  orgId: string,
  message: string,
  type: 'alert' | 'info' | 'warning' = 'info',
  category: NotificationCategory = 'system',
  scheduledFor: string,
  priority = 1,
  expiresAt?: string
): ExtendedNotification {
  const notification: ExtendedNotification & { scheduledFor: string } = {
    id: notificationStore.length + scheduledNotifications.length + 1,
    orgId,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    category,
    priority,
    expiresAt,
    scheduledFor,
  };
  scheduledNotifications.push(notification);
  return notification;
}

export function searchNotifications(
  orgId: string,
  query: string,
  options?: { type?: 'alert' | 'info' | 'warning'; category?: NotificationCategory }
): BrokerNotification[] {
  return notificationStore.filter((n: BrokerNotification) =>
    n.orgId === orgId &&
    n.message.toLowerCase().includes(query.toLowerCase()) &&
    (!options?.type || n.type === options.type) &&
    (!(n as any).category || !options?.category || (n as any).category === options.category)
  );
}

export function removeExpiredNotifications(): number {
  const now = Date.now();
  let removed = 0;
  for (let i = notificationStore.length - 1; i >= 0; i--) {
    const n = notificationStore[i] as any;
    if (n.expiresAt && Date.parse(n.expiresAt) < now) {
      notificationStore.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  // TODO: Integrate with email provider (SendGrid, SES, etc.)
  console.log(`[Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
  return true;
}

export async function sendSlackNotification(
  channel: string,
  message: string
): Promise<boolean> {
  // TODO: Integrate with Slack webhook
  console.log(`[Slack] Channel: ${channel} | Message: ${message}`);
  return true;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  // TODO: Integrate with push notification provider (e.g., Firebase, OneSignal)
  console.log(`[Push] User: ${userId} | Title: ${title} | Body: ${body} | Data:`, data);
  return true;
}

export function getScheduledNotifications(orgId: string): Array<ExtendedNotification & { scheduledFor: string }> {
  return scheduledNotifications.filter(n => n.orgId === orgId);
}
