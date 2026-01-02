import { z } from 'zod';

// Report metadata validation
export const ReportMetadataSchema = z.object({
  reportId: z.string().min(1),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  contractId: z.string().min(1),
  status: z.enum(['draft', 'final', 'archived']),
});

// Risk section validation
export const RiskSectionSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskFlags: z.array(z.string()),
  summary: z.string().min(1),
});

// Score section validation
export const ScoreSectionSchema = z.object({
  totalScore: z.number().min(0).max(100),
  weights: z.record(z.string(), z.number()),
  details: z.string().optional(),
});

// Report creation validation
export const ReportCreateSchema = z.object({
  metadata: ReportMetadataSchema,
  risk: RiskSectionSchema,
  score: ScoreSectionSchema,
  pdfUrl: z.string().url().optional(),
});

// Utility functions
export function validateReportMetadata(data: unknown) {
  return ReportMetadataSchema.safeParse(data);
}

export function validateRiskSection(data: unknown) {
  return RiskSectionSchema.safeParse(data);
}

export function validateScoreSection(data: unknown) {
  return ScoreSectionSchema.safeParse(data);
}

export function validateReportCreate(data: unknown) {
  return ReportCreateSchema.safeParse(data);
}
