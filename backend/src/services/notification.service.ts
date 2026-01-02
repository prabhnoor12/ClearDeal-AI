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

const notificationStore: BrokerNotification[] = [];

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
  return notificationStore.filter(n => n.orgId === orgId).slice(-50);
}

export async function createBrokerNotification(orgId: string, message: string, type: 'alert' | 'info' | 'warning' = 'info'): Promise<BrokerNotification> {
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
  const notification = notificationStore.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

export async function getUnreadCount(orgId: string): Promise<number> {
  return notificationStore.filter(n => n.orgId === orgId && !n.read).length;
}

export async function sendEmailNotification(to: string, subject: string, body: string): Promise<boolean> {
  // TODO: Integrate with email provider (SendGrid, SES, etc.)
  console.log(`[Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
  return true;
}

export async function sendSlackNotification(channel: string, message: string): Promise<boolean> {
  // TODO: Integrate with Slack webhook
  console.log(`[Slack] Channel: ${channel} | Message: ${message}`);
  return true;
}
