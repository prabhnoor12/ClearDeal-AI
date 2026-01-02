// Broker alerts job: monitors broker risk and sends notifications
import { brokerSafetyService } from '../services/brokerSafety.service';
import { notificationService } from '../services/notification.service';

export async function runBrokerAlertsJob() {
  // Fetch brokers with critical or warning status
  const brokers = await brokerSafetyService.getBrokersWithAlerts();
  for (const broker of brokers) {
    await notificationService.notifyAdmin({
      type: 'broker_alert',
      error: broker,
      url: `/broker/${broker.id}`,
      method: 'JOB',
      user: broker,
      timestamp: new Date(),
    });
  }
  console.log(`[BrokerAlertsJob] Processed ${brokers.length} broker alerts.`);
}
