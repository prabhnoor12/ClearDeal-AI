import { z } from 'zod';

// Risk flag validation
export const RiskFlagSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

// Risk analysis validation
export const RiskAnalysisSchema = z.object({
  contractId: z.string().min(1),
  score: z.number().min(0).max(100),
  flags: z.array(RiskFlagSchema),
  summary: z.string().min(1),
  analyzedAt: z.string().datetime(),
});

// Risk history validation
export const RiskHistorySchema = z.object({
  contractId: z.string().min(1),
  history: z.array(
    z.object({
      analyzedAt: z.string().datetime(),
      score: z.number().min(0).max(100),
      flags: z.array(RiskFlagSchema),
    })
  ),
});

// Utility functions
export function validateRiskFlag(data: unknown) {
  return RiskFlagSchema.safeParse(data);
}

export function validateRiskAnalysis(data: unknown) {
  return RiskAnalysisSchema.safeParse(data);
}

export function validateRiskHistory(data: unknown) {
  return RiskHistorySchema.safeParse(data);
}
