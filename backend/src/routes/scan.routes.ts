// Scan routes: Document scanning endpoints
import { Router } from 'express';
import * as scanController from '../controllers/scan.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * POST /scans
 * Create a new scan request
 */
router.post('/', authenticate, scanController.createScanRequest);

/**
 * GET /scans/:id
 * Get scan by ID
 */
router.get('/:id', authenticate, scanController.getScanById);

/**
 * PUT /scans/:id
 * Update a scan
 */
router.put('/:id', authenticate, scanController.updateScan);

/**
 * DELETE /scans/:id
 * Delete a scan
 */
router.delete('/:id', authenticate, scanController.deleteScan);

/**
 * GET /scans/:scanId/progress
 * Get scan progress
 */
router.get('/:scanId/progress', authenticate, scanController.getScanProgress);

/**
 * POST /scans/:scanId/execute
 * Execute a scan
 */
router.post('/:scanId/execute', authenticate, scanController.executeScan);

/**
 * POST /scans/:scanId/retry
 * Retry a failed scan
 */
router.post('/:scanId/retry', authenticate, scanController.retryFailedScan);

/**
 * GET /scans/user/:userId/recent
 * Get recent scans for a user
 */
router.get('/user/:userId/recent', authenticate, scanController.getRecentScans);

export default router;
