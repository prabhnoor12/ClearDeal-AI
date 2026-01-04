// Report routes: Report management endpoints
import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * GET /reports
 * List reports with filtering and pagination
 */
router.get('/', authenticate, reportController.listReports);

/**
 * GET /reports/summaries
 * Get report summaries for dashboard
 */
router.get('/summaries', authenticate, reportController.getReportSummaries);

/**
 * GET /reports/statistics
 * Get report statistics for an organization
 */
router.get('/statistics', authenticate, reportController.getReportStatistics);

/**
 * POST /reports/generate
 * Generate a comprehensive risk report for a contract
 */
router.post('/generate', authenticate, reportController.generateReport);

/**
 * POST /reports/draft
 * Create a draft report without full analysis
 */
router.post('/draft', authenticate, reportController.createDraftReport);

/**
 * POST /reports/bulk
 * Generate reports for multiple contracts
 */
router.post('/bulk', authenticate, reportController.generateBulkReports);

/**
 * POST /reports/compare
 * Compare two reports
 */
router.post('/compare', authenticate, reportController.compareReports);

/**
 * GET /reports/contract/:contractId
 * Get all reports for a contract
 */
router.get('/contract/:contractId', authenticate, reportController.getReportsByContract);

/**
 * GET /reports/contract/:contractId/latest
 * Get the latest report for a contract
 */
router.get('/contract/:contractId/latest', authenticate, reportController.getLatestReport);

/**
 * GET /reports/:id
 * Get a report by ID
 */
router.get('/:id', authenticate, reportController.getReport);

/**
 * GET /reports/:id/secure
 * Get a report with access control
 */
router.get('/:id/secure', authenticate, reportController.getReportSecure);

/**
 * GET /reports/:id/pdf
 * Get or generate PDF for a report
 */
router.get('/:id/pdf', authenticate, reportController.getReportPDF);

/**
 * GET /reports/:id/export/json
 * Export report as JSON
 */
router.get('/:id/export/json', authenticate, reportController.exportReportJSON);

/**
 * GET /reports/:id/export/text
 * Export report as plain text
 */
router.get('/:id/export/text', authenticate, reportController.exportReportText);

/**
 * PUT /reports/:id
 * Update a report
 */
router.put('/:id', authenticate, reportController.updateReport);

/**
 * POST /reports/:id/finalize
 * Finalize a report
 */
router.post('/:id/finalize', authenticate, reportController.finalizeReport);

/**
 * POST /reports/:id/archive
 * Archive a report
 */
router.post('/:id/archive', authenticate, reportController.archiveReport);

/**
 * POST /reports/:id/regenerate-pdf
 * Regenerate PDF for a report
 */
router.post('/:id/regenerate-pdf', authenticate, reportController.regeneratePDF);

/**
 * DELETE /reports/:id
 * Delete a report
 */
router.delete('/:id', authenticate, reportController.deleteReport);

export default router;
