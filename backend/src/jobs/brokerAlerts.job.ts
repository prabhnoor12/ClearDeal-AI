// Broker alerts job: monitors broker risk and sends notifications
import { brokerSafetyService } from '../services/brokerSafety.service';
import { notificationService } from '../services/notification.service';

export async function runBrokerAlertsJob({ maxRetries = 2 } = {}) {
  const start = Date.now();
  let processed = 0;
  let failures = 0;
  try {
    // Fetch brokers with critical or warning status
    const brokers = await brokerSafetyService.getBrokersWithAlerts();
    for (const broker of brokers) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          await notificationService.notifyAdmin({
            type: 'broker_alert',
            error: broker,
            url: `/broker/${broker.id}`,
            method: 'JOB',
            user: broker,
            timestamp: new Date(),
          });
          processed++;
          break;
        } catch (err) {
          attempt++;
          if (attempt > maxRetries) {
            failures++;
            console.error(`[BrokerAlertsJob] Failed to notify for broker ${broker.id}:`, err);
          }
        }
      }
    }
    const duration = Date.now() - start;
    console.log(`[BrokerAlertsJob] Processed ${processed} alerts, ${failures} failures, duration: ${duration}ms.`);
  } catch (err) {
    console.error(`[BrokerAlertsJob] Fatal error:`, err);
  }
}
