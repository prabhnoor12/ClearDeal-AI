// Report service: orchestrates report generation, retrieval, and management
import * as reportRepository from '../repositories/report.repository';
import * as contractRepository from '../repositories/contract.repository';
import { Report, ReportMetadata, ReportSection, ReportStatus } from '../reports/report.types';
import { buildReport } from '../reports/report.builder';
import { generatePDF } from '../reports/pdf.generator';
import { analyzeRisk } from './riskAnalysis.service';
import { getRiskScore } from './riskScore.service';
import { logger } from '../utils/logger';
import { RiskAnalysis, RiskScore } from '../types/risk.types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CreateReportOptions {
  contractId: string;
  createdBy: string;
  includeRiskAnalysis?: boolean;
  generatePdf?: boolean;
  customSections?: ReportSection[];
  status?: ReportStatus;
}

export interface ReportGenerationResult {
  report: Report;
  pdfUrl?: string | undefined;
  generatedAt: string;
  processingTimeMs: number;
}

export interface ReportListOptions {
  organizationId?: string;
  createdBy?: string;
  contractId?: string;
  status?: ReportStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export interface ReportListResult {
  reports: Report[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ReportSummary {
  reportId: string;
  contractTitle: string;
  score: number;
  riskLevel: string;
  status: ReportStatus;
  createdAt: string;
  flagCount: number;
}

export interface BulkReportResult {
  successful: ReportGenerationResult[];
  failed: Array<{ contractId: string; error: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// ============================================================================
// Report Creation & Generation
// ============================================================================

/**
 * Generate a comprehensive risk report for a contract
 * This is the main entry point for report generation
 */
export async function generateReport(options: CreateReportOptions): Promise<ReportGenerationResult> {
  const startTime = Date.now();
  const { contractId, createdBy, includeRiskAnalysis = true, generatePdf = true } = options;

  logger.info(`[ReportService] Generating report for contract ${contractId}`);

  // Fetch contract
  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    throw new ReportError(`Contract not found: ${contractId}`, 'CONTRACT_NOT_FOUND');
  }

  // Perform or fetch risk analysis
  let riskAnalysis: RiskAnalysis;
  let riskScore: RiskScore;

  if (includeRiskAnalysis) {
    logger.debug(`[ReportService] Running risk analysis for contract ${contractId}`);
    riskAnalysis = await analyzeRisk(contractId);
    riskScore = riskAnalysis.riskScore;
  } else {
    const existingScore = await getRiskScore(contractId);
    if (!existingScore) {
      throw new ReportError(
        'No existing risk score found. Set includeRiskAnalysis to true.',
        'RISK_SCORE_MISSING'
      );
    }
    riskScore = existingScore;
    riskAnalysis = {
      contractId,
      summary: 'Risk analysis retrieved from cache',
      riskScore,
      explanations: riskScore.flags.map(f => f.description),
    };
  }

  // Build report
  const report = buildReport({
    contract,
    risk: riskAnalysis,
    score: riskScore,
    createdBy,
    status: options.status || 'draft',
  });

  // Add custom sections if provided
  if (options.customSections && options.customSections.length > 0) {
    report.sections.push(...options.customSections);
  }

  // Generate PDF if requested
  let pdfUrl: string | undefined;
  if (generatePdf) {
    logger.debug(`[ReportService] Generating PDF for report ${report.metadata.reportId}`);
    pdfUrl = await generatePDF(report);
    report.pdfUrl = pdfUrl;
  }

  // Save report
  const savedReport = await reportRepository.create(report);

  const processingTimeMs = Date.now() - startTime;
  logger.info(
    `[ReportService] Report ${savedReport.metadata.reportId} generated in ${processingTimeMs}ms`
  );

  return {
    report: savedReport,
    pdfUrl,
    generatedAt: new Date().toISOString(),
    processingTimeMs,
  };
}

/**
 * Create a draft report without running full analysis
 */
export async function createDraftReport(
  contractId: string,
  createdBy: string
): Promise<Report> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    throw new ReportError(`Contract not found: ${contractId}`, 'CONTRACT_NOT_FOUND');
  }

  const draftReport = buildReport({
    contract,
    risk: {
      contractId,
      summary: 'Draft - Risk analysis pending',
      riskScore: {
        contractId,
        score: 0,
        calculatedAt: new Date().toISOString(),
        flags: [],
      },
      explanations: [],
    },
    score: {
      contractId,
      score: 0,
      calculatedAt: new Date().toISOString(),
      flags: [],
    },
    createdBy,
    status: 'draft',
  });

  return reportRepository.create(draftReport);
}

/**
 * Create a report from existing data (low-level create)
 */
export async function createReport(data: Report): Promise<Report> {
  validateReport(data);
  return reportRepository.create(data);
}

/**
 * Generate reports for multiple contracts in bulk
 */
export async function generateBulkReports(
  contractIds: string[],
  createdBy: string,
  options: Partial<CreateReportOptions> = {}
): Promise<BulkReportResult> {
  const successful: ReportGenerationResult[] = [];
  const failed: Array<{ contractId: string; error: string }> = [];

  logger.info(`[ReportService] Starting bulk report generation for ${contractIds.length} contracts`);

  for (const contractId of contractIds) {
    try {
      const result = await generateReport({
        contractId,
        createdBy,
        ...options,
      });
      successful.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[ReportService] Failed to generate report for ${contractId}:`, error);
      failed.push({ contractId, error: errorMessage });
    }
  }

  logger.info(
    `[ReportService] Bulk generation complete: ${successful.length} succeeded, ${failed.length} failed`
  );

  return {
    successful,
    failed,
    totalProcessed: contractIds.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

// ============================================================================
// Report Retrieval
// ============================================================================

/**
 * Get a report by ID
 */
export async function getReportById(id: string): Promise<Report | null> {
  return reportRepository.findById(id);
}

/**
 * Get a report by ID with access control
 */
export async function getReportByIdSecure(
  id: string,
  userId: string,
  organizationId: string
): Promise<Report | null> {
  const report = await reportRepository.findById(id);
  if (!report) return null;

  // Check access permissions
  if (
    report.metadata.createdBy !== userId &&
    report.contract.organizationId !== organizationId
  ) {
    throw new ReportError('Access denied to this report', 'ACCESS_DENIED');
  }

  return report;
}

/**
 * Get all reports for a contract
 */
export async function getReportsByContractId(contractId: string): Promise<Report[]> {
  const allReports = await reportRepository.findAll();
  return allReports.filter(r => r.metadata.contractId === contractId);
}

/**
 * Get the latest report for a contract
 */
export async function getLatestReportByContractId(contractId: string): Promise<Report | null> {
  const reports = await getReportsByContractId(contractId);
  if (reports.length === 0) return null;

  const sorted = reports.sort(
    (a, b) =>
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
  );
  return sorted[0] ?? null;
}

/**
 * List reports with filtering, pagination, and sorting
 */
export async function listReports(options: ReportListOptions = {}): Promise<ReportListResult> {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  let reports = await reportRepository.findAll();

  // Apply filters
  if (options.organizationId) {
    reports = reports.filter(r => r.contract.organizationId === options.organizationId);
  }
  if (options.createdBy) {
    reports = reports.filter(r => r.metadata.createdBy === options.createdBy);
  }
  if (options.contractId) {
    reports = reports.filter(r => r.metadata.contractId === options.contractId);
  }
  if (options.status) {
    reports = reports.filter(r => r.metadata.status === options.status);
  }
  if (options.fromDate) {
    const fromTime = new Date(options.fromDate).getTime();
    reports = reports.filter(r => new Date(r.metadata.createdAt).getTime() >= fromTime);
  }
  if (options.toDate) {
    const toTime = new Date(options.toDate).getTime();
    reports = reports.filter(r => new Date(r.metadata.createdAt).getTime() <= toTime);
  }

  // Sort
  reports.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'createdAt') {
      comparison =
        new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
    } else if (sortBy === 'score') {
      comparison = a.score.score - b.score.score;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const total = reports.length;
  const paginatedReports = reports.slice(offset, offset + limit);

  return {
    reports: paginatedReports,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Get report summaries for dashboard display
 */
export async function getReportSummaries(
  organizationId: string,
  limit = 10
): Promise<ReportSummary[]> {
  const { reports } = await listReports({
    organizationId,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return reports.map(r => ({
    reportId: r.metadata.reportId,
    contractTitle: r.contract.title,
    score: r.score.score,
    riskLevel: getRiskLevelLabel(r.score.score),
    status: r.metadata.status,
    createdAt: r.metadata.createdAt,
    flagCount: r.score.flags.length,
  }));
}

// ============================================================================
// Report Updates & Management
// ============================================================================

/**
 * Update a report
 */
export async function updateReport(
  id: string,
  updates: Partial<Report>
): Promise<Report | null> {
  const existing = await reportRepository.findById(id);
  if (!existing) return null;

  // Prevent updating finalized reports
  if (existing.metadata.status === 'final' && updates.metadata?.status !== 'archived') {
    throw new ReportError('Cannot modify a finalized report', 'REPORT_FINALIZED');
  }

  logger.info(`[ReportService] Updating report ${id}`);
  return reportRepository.update(id, updates);
}

/**
 * Finalize a report (mark as final, generate PDF if missing)
 */
export async function finalizeReport(id: string): Promise<Report> {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new ReportError(`Report not found: ${id}`, 'REPORT_NOT_FOUND');
  }

  if (report.metadata.status === 'final') {
    throw new ReportError('Report is already finalized', 'ALREADY_FINALIZED');
  }

  // Generate PDF if not present
  if (!report.pdfUrl) {
    report.pdfUrl = await generatePDF(report);
  }

  report.metadata.status = 'final';

  const updated = await reportRepository.update(id, report);
  if (!updated) {
    throw new ReportError('Failed to finalize report', 'UPDATE_FAILED');
  }

  logger.info(`[ReportService] Report ${id} finalized`);
  return updated;
}

/**
 * Archive a report
 */
export async function archiveReport(id: string): Promise<Report | null> {
  logger.info(`[ReportService] Archiving report ${id}`);
  return reportRepository.update(id, {
    metadata: { status: 'archived' } as Partial<ReportMetadata>,
  } as Partial<Report>);
}

/**
 * Delete a report (soft delete by archiving, or hard delete)
 */
export async function deleteReport(id: string, hardDelete = false): Promise<boolean> {
  const report = await reportRepository.findById(id);
  if (!report) return false;

  if (report.metadata.status === 'final' && !hardDelete) {
    throw new ReportError('Cannot delete a finalized report. Use hard delete.', 'REPORT_FINALIZED');
  }

  if (hardDelete) {
    logger.warn(`[ReportService] Hard deleting report ${id}`);
    return reportRepository.deleteById(id);
  }

  await archiveReport(id);
  return true;
}

// ============================================================================
// PDF & Export
// ============================================================================

/**
 * Regenerate PDF for an existing report
 */
export async function regeneratePDF(id: string): Promise<string> {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new ReportError(`Report not found: ${id}`, 'REPORT_NOT_FOUND');
  }

  logger.info(`[ReportService] Regenerating PDF for report ${id}`);
  const pdfUrl = await generatePDF(report);

  await reportRepository.update(id, { pdfUrl });

  return pdfUrl;
}

/**
 * Get or generate PDF URL for a report
 */
export async function getReportPDF(id: string): Promise<string> {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new ReportError(`Report not found: ${id}`, 'REPORT_NOT_FOUND');
  }

  if (report.pdfUrl) {
    return report.pdfUrl;
  }

  return regeneratePDF(id);
}

/**
 * Export report as JSON
 */
export async function exportReportAsJSON(id: string): Promise<string> {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new ReportError(`Report not found: ${id}`, 'REPORT_NOT_FOUND');
  }

  return JSON.stringify(report, null, 2);
}

/**
 * Export report as plain text summary
 */
export async function exportReportAsText(id: string): Promise<string> {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new ReportError(`Report not found: ${id}`, 'REPORT_NOT_FOUND');
  }

  const lines = [
    `Report: ${report.metadata.reportId}`,
    `Contract: ${report.contract.title}`,
    `Status: ${report.metadata.status}`,
    `Created: ${report.metadata.createdAt}`,
    '',
    `Risk Score: ${report.score.score}/100 (${getRiskLevelLabel(report.score.score)})`,
    '',
    'Summary:',
    report.risk.summary,
    '',
    'Risk Flags:',
    ...report.score.flags.map(f => `  - [${f.severity.toUpperCase()}] ${f.code}: ${f.description}`),
    '',
    'Sections:',
    ...report.sections.map(s => `\n## ${s.title}\n${s.content}`),
  ];

  return lines.join('\n');
}

// ============================================================================
// Analytics & Statistics
// ============================================================================

/**
 * Get report statistics for an organization
 */
export async function getReportStatistics(organizationId: string): Promise<{
  totalReports: number;
  byStatus: Record<ReportStatus, number>;
  averageScore: number;
  riskDistribution: Record<string, number>;
  reportsThisMonth: number;
  reportsThisWeek: number;
}> {
  const { reports } = await listReports({ organizationId, limit: 10000 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byStatus: Record<ReportStatus, number> = { draft: 0, final: 0, archived: 0 };
  const riskDistribution: Record<string, number> = {
    low: 0,
    moderate: 0,
    elevated: 0,
    high: 0,
    critical: 0,
  };

  let totalScore = 0;
  let reportsThisWeek = 0;
  let reportsThisMonth = 0;

  for (const report of reports) {
    byStatus[report.metadata.status]++;
    const riskLevel = getRiskLevelLabel(report.score.score).toLowerCase() as keyof typeof riskDistribution;
    riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
    totalScore += report.score.score;

    const createdAt = new Date(report.metadata.createdAt);
    if (createdAt >= weekAgo) reportsThisWeek++;
    if (createdAt >= monthAgo) reportsThisMonth++;
  }

  return {
    totalReports: reports.length,
    byStatus,
    averageScore: reports.length > 0 ? Math.round(totalScore / reports.length) : 0,
    riskDistribution,
    reportsThisMonth,
    reportsThisWeek,
  };
}

/**
 * Compare two reports for the same contract
 */
export async function compareReports(
  reportId1: string,
  reportId2: string
): Promise<{
  scoreDiff: number;
  newFlags: string[];
  resolvedFlags: string[];
  statusChange: string | null;
}> {
  const [report1, report2] = await Promise.all([
    reportRepository.findById(reportId1),
    reportRepository.findById(reportId2),
  ]);

  if (!report1 || !report2) {
    throw new ReportError('One or both reports not found', 'REPORT_NOT_FOUND');
  }

  if (report1.metadata.contractId !== report2.metadata.contractId) {
    throw new ReportError('Reports must be for the same contract', 'INVALID_COMPARISON');
  }

  const flagCodes1 = new Set(report1.score.flags.map(f => f.code));
  const flagCodes2 = new Set(report2.score.flags.map(f => f.code));

  const newFlags = [...flagCodes2].filter(c => !flagCodes1.has(c));
  const resolvedFlags = [...flagCodes1].filter(c => !flagCodes2.has(c));

  return {
    scoreDiff: report2.score.score - report1.score.score,
    newFlags,
    resolvedFlags,
    statusChange:
      report1.metadata.status !== report2.metadata.status
        ? `${report1.metadata.status} → ${report2.metadata.status}`
        : null,
  };
}

// ============================================================================
// Helpers & Utilities
// ============================================================================

/**
 * Get human-readable risk level label
 */
function getRiskLevelLabel(score: number): string {
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Elevated';
  if (score >= 20) return 'High';
  return 'Critical';
}

/**
 * Validate report data
 */
function validateReport(report: Report): void {
  if (!report.metadata?.reportId) {
    throw new ReportError('Report ID is required', 'VALIDATION_ERROR');
  }
  if (!report.metadata?.contractId) {
    throw new ReportError('Contract ID is required', 'VALIDATION_ERROR');
  }
  if (!report.metadata?.createdBy) {
    throw new ReportError('Creator ID is required', 'VALIDATION_ERROR');
  }
  if (!report.contract) {
    throw new ReportError('Contract data is required', 'VALIDATION_ERROR');
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class ReportError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
  }
}

/**
 * Check if an error is a ReportError
 */
export function isReportError(error: unknown): error is ReportError {
  return error instanceof ReportError;
}
