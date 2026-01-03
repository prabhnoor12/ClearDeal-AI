// Document check controller: Handles document validation and compliance checks
import { Request, Response, NextFunction } from 'express';
import * as documentCheckService from '../services/documentCheck.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * GET /documents/check/:contractId
 * Check missing documents for a contract
 */
export async function checkMissingDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    const state = (req.query['state'] as string) || 'DEFAULT';
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const result = await documentCheckService.checkMissingDocuments(contractId, state);
    sendSuccess(res, result, 'Document check completed');
  } catch (error) {
    logger.error('[DocumentCheckController] checkMissingDocuments error', error);
    next(error);
  }
}

/**
 * POST /documents/validate
 * Validate a document
 */
export async function validateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const document = req.body;
    if (!document) {
      sendError(res, 'Document is required', 400);
      return;
    }
    const result = await documentCheckService.validateDocument(document);
    sendSuccess(res, result, 'Document validated');
  } catch (error) {
    logger.error('[DocumentCheckController] validateDocument error', error);
    next(error);
  }
}

/**
 * POST /documents/validate-enhanced
 * Enhanced document validation with file size and format checks
 */
export async function validateDocumentEnhanced(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { document, fileSize, fileName } = req.body;
    if (!document) {
      sendError(res, 'Document is required', 400);
      return;
    }
    const result = await documentCheckService.validateDocumentEnhanced(document, fileSize, fileName);
    sendSuccess(res, result, 'Enhanced validation completed');
  } catch (error) {
    logger.error('[DocumentCheckController] validateDocumentEnhanced error', error);
    next(error);
  }
}

/**
 * POST /documents/bulk/:contractId
 * Add multiple documents to a contract
 */
export async function addMultipleDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    const { documents } = req.body;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!documents || !Array.isArray(documents)) {
      sendError(res, 'Documents array is required', 400);
      return;
    }
    const result = await documentCheckService.addMultipleDocuments(contractId, documents);
    sendSuccess(res, result, 'Documents added', undefined, 201);
  } catch (error) {
    logger.error('[DocumentCheckController] addMultipleDocuments error', error);
    next(error);
  }
}

/**
 * GET /documents/completeness/:contractId
 * Get document completeness report
 */
export async function getCompletenessReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    const state = (req.query['state'] as string) || 'DEFAULT';
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    const report = await documentCheckService.generateDocumentCompletenessReport(contractId, state);
    sendSuccess(res, report, 'Completeness report generated');
  } catch (error) {
    logger.error('[DocumentCheckController] getCompletenessReport error', error);
    next(error);
  }
}

/**
 * POST /documents/classify
 * Classify document using AI
 */
export async function classifyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      sendError(res, 'Document text is required', 400);
      return;
    }
    const result = await documentCheckService.classifyDocumentWithAI(documentText);
    sendSuccess(res, result, 'Document classified');
  } catch (error) {
    logger.error('[DocumentCheckController] classifyDocument error', error);
    next(error);
  }
}

/**
 * GET /documents/compare
 * Compare documents between two contracts
 */
export async function compareDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId1, contractId2 } = req.query;
    if (!contractId1 || !contractId2) {
      sendError(res, 'Both contractId1 and contractId2 are required', 400);
      return;
    }
    const result = await documentCheckService.compareDocuments(contractId1 as string, contractId2 as string);
    sendSuccess(res, result, 'Documents compared');
  } catch (error) {
    logger.error('[DocumentCheckController] compareDocuments error', error);
    next(error);
  }
}

/**
 * POST /documents/:contractId
 * Add a document to a contract
 */
export async function addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractId } = req.params;
    const document = req.body;
    if (!contractId) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!document) {
      sendError(res, 'Document is required', 400);
      return;
    }
    const result = await documentCheckService.addDocumentToContract(contractId, document);
    sendSuccess(res, result, 'Document added', undefined, 201);
  } catch (error) {
    logger.error('[DocumentCheckController] addDocument error', error);
    next(error);
  }
}
