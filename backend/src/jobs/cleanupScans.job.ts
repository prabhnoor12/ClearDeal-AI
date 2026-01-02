// Cleanup scans job: removes old/failed scans from database/storage
import { scanRepository } from '../repositories/scan.repository';

export async function cleanupScansJob({ daysOld = 30, maxRetries = 2 } = {}) {
  const start = Date.now();
  let deleted = 0;
  let failures = 0;
  try {
    const oldScans = await scanRepository.findOldOrFailedScans(daysOld);
    for (const scan of oldScans) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          await scanRepository.deleteScan(scan.id);
          deleted++;
          break;
        } catch (err) {
          attempt++;
          if (attempt > maxRetries) {
            failures++;
            console.error(`[CleanupScansJob] Failed to delete scan ${scan.id}:`, err);
          }
        }
      }
    }
    const duration = Date.now() - start;
    console.log(`[CleanupScansJob] Deleted ${deleted} scans, ${failures} failures, duration: ${duration}ms.`);
  } catch (err) {
    console.error(`[CleanupScansJob] Fatal error:`, err);
  }
}
