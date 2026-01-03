import { Request, Response, NextFunction } from 'express';
import * as scanService from '../services/scan.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Create a new scan request
 */
export async function createScanRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { documentUrl, requestedBy, scanType, options } = req.body;

    if (!documentUrl || !requestedBy || !scanType) {
      sendError(res, 'Document URL, requestedBy, and scan type are required', 400);
      return;
    }

    const scan = await scanService.createScanRequest({
      documentUrl,
      requestedBy,
      scanType,
      options,
    });
    sendSuccess(res, scan, 'Scan request created', undefined, 201);
  } catch (error) {
    logger.error('[Scan] createScanRequest error', error);
    next(error);
  }
}

/**
 * Get scan by ID
 */
export async function getScanById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    const scan = await scanService.getScanById(id);

    if (!scan) {
      sendError(res, 'Scan not found', 404);
      return;
    }

    sendSuccess(res, scan, 'Scan retrieved');
  } catch (error) {
    logger.error('[Scan] getScanById error', error);
    next(error);
  }
}

/**
 * Get scan progress
 */
export async function getScanProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { scanId } = req.params;

    if (!scanId) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    const progress = await scanService.getScanProgress(scanId);

    if (!progress) {
      sendError(res, 'Scan progress not found', 404);
      return;
    }

    sendSuccess(res, progress, 'Scan progress retrieved');
  } catch (error) {
    logger.error('[Scan] getScanProgress error', error);
    next(error);
  }
}

/**
 * Update a scan
 */
export async function updateScan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    const scan = await scanService.updateScan(id, updates);

    if (!scan) {
      sendError(res, 'Scan not found', 404);
      return;
    }

    sendSuccess(res, scan, 'Scan updated');
  } catch (error) {
    logger.error('[Scan] updateScan error', error);
    next(error);
  }
}

/**
 * Delete a scan
 */
export async function deleteScan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    const deleted = await scanService.deleteScan(id);

    if (!deleted) {
      sendError(res, 'Scan not found', 404);
      return;
    }

    sendSuccess(res, null, 'Scan deleted');
  } catch (error) {
    logger.error('[Scan] deleteScan error', error);
    next(error);
  }
}

/**
 * Execute a scan
 */
export async function executeScan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { scanId } = req.params;
    const { contractText, options } = req.body;

    if (!scanId) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const result = await scanService.executeScan(scanId, contractText, options);
    sendSuccess(res, result, 'Scan executed');
  } catch (error) {
    logger.error('[Scan] executeScan error', error);
    next(error);
  }
}

/**
 * Get recent scans for a user
 */
export async function getRecentScans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    if (!userId) {
      sendError(res, 'User ID is required', 400);
      return;
    }

    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    const scans = await scanService.getRecentScans(userId, limitNum);
    sendSuccess(res, scans, 'Recent scans retrieved');
  } catch (error) {
    logger.error('[Scan] getRecentScans error', error);
    next(error);
  }
}

/**
 * Retry a failed scan
 */
export async function retryFailedScan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { scanId } = req.params;
    const { contractText } = req.body;

    if (!scanId) {
      sendError(res, 'Scan ID is required', 400);
      return;
    }

    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const result = await scanService.retryFailedScan(scanId, contractText);
    sendSuccess(res, result, 'Scan retry completed');
  } catch (error) {
    logger.error('[Scan] retryFailedScan error', error);
    next(error);
  }
}
