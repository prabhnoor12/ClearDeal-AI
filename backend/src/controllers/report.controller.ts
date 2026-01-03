// Report controller: handles HTTP requests for report operations
import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /reports/generate
 * Generate a comprehensive risk report for a contract
 */
export async function generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId, includeRiskAnalysis, generatePdf, customSections, status } = req.body;
    const createdBy = req.user?.userId || req.body.createdBy;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!createdBy) {
      sendError(res, 'Creator ID is required', 400);
      return;
    }
    const options: reportService.CreateReportOptions = { contractId, createdBy };
    if (includeRiskAnalysis !== undefined) options.includeRiskAnalysis = includeRiskAnalysis;
    if (generatePdf !== undefined) options.generatePdf = generatePdf;
    if (customSections) options.customSections = customSections;
    if (status) options.status = status;
    const result = await reportService.generateReport(options);
    sendSuccess(res, result, 'Report generated successfully', undefined, 201);
  } catch (error) {
    logger.error('[ReportController] generateReport error', error);
    next(error);
  }
}

/**
 * POST /reports/draft
 * Create a draft report without full analysis
 */
export async function createDraftReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.body;
    const createdBy = req.user?.userId || req.body.createdBy;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!createdBy) {
      sendError(res, 'Creator ID is required', 400);
      return;
    }
    const report = await reportService.createDraftReport(contractId, createdBy);
    sendSuccess(res, report, 'Draft report created', undefined, 201);
  } catch (error) {
    logger.error('[ReportController] createDraftReport error', error);
    next(error);
  }
}

/**
 * POST /reports/bulk
 * Generate reports for multiple contracts
 */
export async function generateBulkReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractIds, includeRiskAnalysis, generatePdf } = req.body;
    const createdBy = req.user?.userId || req.body.createdBy;
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      sendError(res, 'Contract IDs array is required', 400);
      return;
    }
    if (!createdBy) {
      sendError(res, 'Creator ID is required', 400);
      return;
    }
    const options: Partial<reportService.CreateReportOptions> = {};
    if (includeRiskAnalysis !== undefined) options.includeRiskAnalysis = includeRiskAnalysis;
    if (generatePdf !== undefined) options.generatePdf = generatePdf;
    const result = await reportService.generateBulkReports(contractIds, createdBy, options);
    sendSuccess(res, result, 'Bulk report generation complete');
  } catch (error) {
    logger.error('[ReportController] generateBulkReports error', error);
    next(error);
  }
}

/**
 * GET /reports/:id
 * Get a report by ID
 */
export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const report = await reportService.getReportById(id);
    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }
    sendSuccess(res, report, 'Report retrieved');
  } catch (error) {
    logger.error('[ReportController] getReport error', error);
    next(error);
  }
}

/**
 * GET /reports/:id/secure
 * Get a report with access control
 */
export async function getReportSecure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId || req.query['organizationId'] as string;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    if (!userId || !organizationId) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    const report = await reportService.getReportByIdSecure(id, userId, organizationId);
    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }
    sendSuccess(res, report, 'Report retrieved');
  } catch (error) {
    logger.error('[ReportController] getReportSecure error', error);
    next(error);
  }
}

/**
 * GET /reports
 * List reports with filtering and pagination
 */
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const options: reportService.ReportListOptions = {};
    if (req.query['organizationId']) options.organizationId = req.query['organizationId'] as string;
    if (req.query['createdBy']) options.createdBy = req.query['createdBy'] as string;
    if (req.query['contractId']) options.contractId = req.query['contractId'] as string;
    const statusParam = req.query['status'] as string | undefined;
    if (statusParam === 'draft' || statusParam === 'final' || statusParam === 'archived') {
      options.status = statusParam;
    }
    if (req.query['fromDate']) options.fromDate = req.query['fromDate'] as string;
    if (req.query['toDate']) options.toDate = req.query['toDate'] as string;
    if (req.query['limit']) options.limit = parseInt(req.query['limit'] as string, 10);
    if (req.query['offset']) options.offset = parseInt(req.query['offset'] as string, 10);
    if (req.query['sortBy']) options.sortBy = req.query['sortBy'] as 'createdAt' | 'score';
    if (req.query['sortOrder']) options.sortOrder = req.query['sortOrder'] as 'asc' | 'desc';
    const result = await reportService.listReports(options);
    sendSuccess(res, result.reports, 'Reports retrieved', {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  } catch (error) {
    logger.error('[ReportController] listReports error', error);
    next(error);
  }
}

/**
 * GET /reports/contract/:contractId
 * Get all reports for a contract
 */
export async function getReportsByContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const reports = await reportService.getReportsByContractId(contractId);
    sendSuccess(res, reports, 'Reports retrieved');
  } catch (error) {
    logger.error('[ReportController] getReportsByContract error', error);
    next(error);
  }
}

/**
 * GET /reports/contract/:contractId/latest
 * Get the latest report for a contract
 */
export async function getLatestReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const report = await reportService.getLatestReportByContractId(contractId);
    if (!report) {
      sendError(res, 'No reports found for this contract', 404);
      return;
    }
    sendSuccess(res, report, 'Latest report retrieved');
  } catch (error) {
    logger.error('[ReportController] getLatestReport error', error);
    next(error);
  }
}

/**
 * GET /reports/summaries
 * Get report summaries for dashboard
 */
export async function getReportSummaries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId || req.query['organizationId'] as string;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    if (!organizationId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const summaries = await reportService.getReportSummaries(organizationId, limit);
    sendSuccess(res, summaries, 'Report summaries retrieved');
  } catch (error) {
    logger.error('[ReportController] getReportSummaries error', error);
    next(error);
  }
}

/**
 * PUT /reports/:id
 * Update a report
 */
export async function updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const report = await reportService.updateReport(id, updates);
    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }
    sendSuccess(res, report, 'Report updated');
  } catch (error) {
    logger.error('[ReportController] updateReport error', error);
    next(error);
  }
}

/**
 * POST /reports/:id/finalize
 * Finalize a report
 */
export async function finalizeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const report = await reportService.finalizeReport(id);
    sendSuccess(res, report, 'Report finalized');
  } catch (error) {
    logger.error('[ReportController] finalizeReport error', error);
    next(error);
  }
}

/**
 * POST /reports/:id/archive
 * Archive a report
 */
export async function archiveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const report = await reportService.archiveReport(id);
    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }
    sendSuccess(res, report, 'Report archived');
  } catch (error) {
    logger.error('[ReportController] archiveReport error', error);
    next(error);
  }
}

/**
 * DELETE /reports/:id
 * Delete a report
 */
export async function deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const hardDelete = req.query['hard'] === 'true';
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const deleted = await reportService.deleteReport(id, hardDelete);
    if (!deleted) {
      sendError(res, 'Report not found', 404);
      return;
    }
    sendSuccess(res, { deleted: true }, hardDelete ? 'Report permanently deleted' : 'Report deleted');
  } catch (error) {
    logger.error('[ReportController] deleteReport error', error);
    next(error);
  }
}

/**
 * POST /reports/:id/regenerate-pdf
 * Regenerate PDF for a report
 */
export async function regeneratePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const pdfUrl = await reportService.regeneratePDF(id);
    sendSuccess(res, { pdfUrl }, 'PDF regenerated');
  } catch (error) {
    logger.error('[ReportController] regeneratePDF error', error);
    next(error);
  }
}

/**
 * GET /reports/:id/pdf
 * Get or generate PDF for a report
 */
export async function getReportPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const pdfUrl = await reportService.getReportPDF(id);
    sendSuccess(res, { pdfUrl }, 'PDF URL retrieved');
  } catch (error) {
    logger.error('[ReportController] getReportPDF error', error);
    next(error);
  }
}

/**
 * GET /reports/:id/export/json
 * Export report as JSON
 */
export async function exportReportJSON(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const jsonString = await reportService.exportReportAsJSON(id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`);
    res.send(jsonString);
  } catch (error) {
    logger.error('[ReportController] exportReportJSON error', error);
    next(error);
  }
}

/**
 * GET /reports/:id/export/text
 * Export report as plain text
 */
export async function exportReportText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Report ID is required', 400);
      return;
    }
    const textString = await reportService.exportReportAsText(id);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.txt"`);
    res.send(textString);
  } catch (error) {
    logger.error('[ReportController] exportReportText error', error);
    next(error);
  }
}

/**
 * GET /reports/statistics
 * Get report statistics for an organization
 */
export async function getReportStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId || req.query['organizationId'] as string;
    if (!organizationId) {
      sendError(res, 'Organization ID is required', 400);
      return;
    }
    const stats = await reportService.getReportStatistics(organizationId);
    sendSuccess(res, stats, 'Report statistics retrieved');
  } catch (error) {
    logger.error('[ReportController] getReportStatistics error', error);
    next(error);
  }
}

/**
 * POST /reports/compare
 * Compare two reports
 */
export async function compareReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reportId1, reportId2 } = req.body;
    if (!reportId1 || !reportId2) {
      sendError(res, 'Two report IDs are required', 400);
      return;
    }
    const comparison = await reportService.compareReports(reportId1, reportId2);
    sendSuccess(res, comparison, 'Reports compared');
  } catch (error) {
    logger.error('[ReportController] compareReports error', error);
    next(error);
  }
}
