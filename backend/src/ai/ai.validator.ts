// Validates AI output using Zod schemas
import { z } from 'zod';

export const ClauseArraySchema = z.array(
  z.object({
    id: z.string(),
    contractId: z.string(),
    text: z.string(),
    type: z.enum(['standard', 'unusual', 'custom']),
    flagged: z.boolean(),
  })
);

export const RiskFlagArraySchema = z.array(
  z.object({
    code: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })
);

export const SummarySchema = z.string().min(10);

export const UnusualClauseArraySchema = z.array(
  z.object({
    text: z.string(),
    reason: z.string(),
  })
);

export function validateClauses(data: unknown) {
  return ClauseArraySchema.safeParse(data);
}

export function validateRiskFlags(data: unknown) {
  return RiskFlagArraySchema.safeParse(data);
}

export function validateSummary(data: unknown) {
  return SummarySchema.safeParse(data);
}

export function validateUnusualClauses(data: unknown) {
  return UnusualClauseArraySchema.safeParse(data);
}
