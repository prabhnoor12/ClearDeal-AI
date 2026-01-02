// Usage tracking job: tracks usage for billing, credits, and analytics
import { billingService } from '../services/billing.service';
import { organizationRepository } from '../repositories/organization.repository';

export async function runUsageTrackingJob({ maxRetries = 2 } = {}) {
  const start = Date.now();
  let processed = 0;
  let failures = 0;
  try {
    // Fetch all organizations
    const orgs = await organizationRepository.getAll();
    for (const org of orgs) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const usage = await billingService.calculateUsage(org.id);
          await billingService.recordUsage(org.id, usage);
          processed++;
          break;
        } catch (err) {
          attempt++;
          if (attempt > maxRetries) {
            failures++;
            console.error(`[UsageTrackingJob] Failed for org ${org.id}:`, err);
          }
        }
      }
    }
    const duration = Date.now() - start;
    console.log(`[UsageTrackingJob] Processed ${processed} orgs, ${failures} failures, duration: ${duration}ms.`);
  } catch (err) {
    console.error(`[UsageTrackingJob] Fatal error:`, err);
  }
}
