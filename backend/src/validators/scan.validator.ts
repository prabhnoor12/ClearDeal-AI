import { z } from 'zod';

// Scan metadata validation
export const ScanMetadataSchema = z.object({
  scanId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  status: z.enum(['pending', 'completed', 'failed']),
});

// Scan request validation
export const ScanRequestSchema = z.object({
  documentUrl: z.string().url(),
  scanType: z.enum(['basic', 'advanced', 'custom']),
  options: z.record(z.string(), z.any()).optional(),
});

// Scan result validation
export const ScanResultSchema = z.object({
  scanId: z.string().min(1),
  findings: z.array(z.string()),
  score: z.number().min(0).max(100),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).optional(),
});

// Utility functions
export function validateScanMetadata(data: unknown) {
  return ScanMetadataSchema.safeParse(data);
}

export function validateScanRequest(data: unknown) {
  return ScanRequestSchema.safeParse(data);
}

export function validateScanResult(data: unknown) {
  return ScanResultSchema.safeParse(data);
}

// Scan validator placeholder
export const validateScan = () => {
  // Implement scan validation
};
