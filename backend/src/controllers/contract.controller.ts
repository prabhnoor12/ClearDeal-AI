// Contract controller: Handles contract CRUD, analysis, and AI operations
import { Request, Response, NextFunction } from 'express';
import * as contractService from '../services/contract.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

// Use Express.User extended type from auth middleware
interface ContractUser {
  userId: string;
  organizationId?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * POST /contracts
 * Create a new contract
 */
export async function createContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as ContractUser | undefined;
    const userId = user?.userId;
    const organizationId = user?.organizationId;

    if (!userId || !organizationId) {
      sendError(res, 'Authentication with organization required', 401);
      return;
    }

    const { title, documents, clauses, disclosures, addenda } = req.body;

    const contract = await contractService.createContract({
      title,
      uploadedBy: userId,
      organizationId,
      documents,
      clauses,
      disclosures,
      addenda,
    });

    sendSuccess(res, contract, 'Contract created', undefined, 201);
  } catch (error) {
    logger.error('[ContractController] createContract error', error);
    next(error);
  }
}

/**
 * GET /contracts/:id
 * Get a contract by ID
 */
export async function getContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const contract = await contractService.getContractById(id);
    if (!contract) {
      sendError(res, 'Contract not found', 404);
      return;
    }

    sendSuccess(res, contract, 'Contract retrieved');
  } catch (error) {
    logger.error('[ContractController] getContract error', error);
    next(error);
  }
}

/**
 * GET /contracts
 * Get all contracts
 */
export async function getAllContracts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contracts = await contractService.getAllContracts();
    sendSuccess(res, contracts, 'Contracts retrieved');
  } catch (error) {
    logger.error('[ContractController] getAllContracts error', error);
    next(error);
  }
}

/**
 * PUT /contracts/:id
 * Update a contract
 */
export async function updateContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const updates = req.body;
    const contract = await contractService.updateContract(id, updates);
    if (!contract) {
      sendError(res, 'Contract not found', 404);
      return;
    }

    sendSuccess(res, contract, 'Contract updated');
  } catch (error) {
    logger.error('[ContractController] updateContract error', error);
    next(error);
  }
}

/**
 * DELETE /contracts/:id
 * Delete a contract
 */
export async function deleteContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const deleted = await contractService.deleteContract(id);
    if (!deleted) {
      sendError(res, 'Contract not found or could not be deleted', 404);
      return;
    }

    sendSuccess(res, { id }, 'Contract deleted');
  } catch (error) {
    logger.error('[ContractController] deleteContract error', error);
    next(error);
  }
}

// ============================================================================
// Search
// ============================================================================

/**
 * GET /contracts/search
 * Search contracts by title or status
 */
export async function searchContracts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, status } = req.query;
    const query: { title?: string; status?: string } = {};
    if (typeof title === 'string') query.title = title;
    if (typeof status === 'string') query.status = status;
    const contracts = await contractService.searchContracts(query);
    sendSuccess(res, contracts, 'Search results');
  } catch (error) {
    logger.error('[ContractController] searchContracts error', error);
    next(error);
  }
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * POST /contracts/:id/submit
 * Submit a contract for review
 */
export async function submitContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const contract = await contractService.submitContract(id);
    if (!contract) {
      sendError(res, 'Contract not found', 404);
      return;
    }

    sendSuccess(res, contract, 'Contract submitted');
  } catch (error) {
    logger.error('[ContractController] submitContract error', error);
    next(error);
  }
}

/**
 * POST /contracts/:id/archive
 * Archive a contract
 */
export async function archiveContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const contract = await contractService.archiveContract(id);
    if (!contract) {
      sendError(res, 'Contract not found', 404);
      return;
    }

    sendSuccess(res, contract, 'Contract archived');
  } catch (error) {
    logger.error('[ContractController] archiveContract error', error);
    next(error);
  }
}

// ============================================================================
// Analysis & AI Operations
// ============================================================================

/**
 * GET /contracts/:id/analyze
 * Analyze a contract and return summary
 */
export async function analyzeContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const analysis = await contractService.analyzeContract(id);
    sendSuccess(res, analysis, 'Contract analyzed');
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      sendError(res, 'Contract not found', 404);
      return;
    }
    logger.error('[ContractController] analyzeContract error', error);
    next(error);
  }
}

/**
 * POST /contracts/:id/extract-clauses
 * Extract clauses from contract text using AI
 */
export async function extractClauses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { contractText } = req.body;

    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const clauses = await contractService.extractClausesFromText(id, contractText);
    sendSuccess(res, clauses, 'Clauses extracted');
  } catch (error) {
    logger.error('[ContractController] extractClauses error', error);
    next(error);
  }
}

/**
 * POST /contracts/summary
 * Generate AI-powered summary of contract text
 */
export async function generateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractText } = req.body;

    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const summary = await contractService.generateContractSummary(contractText);
    sendSuccess(res, { summary }, 'Summary generated');
  } catch (error) {
    logger.error('[ContractController] generateSummary error', error);
    next(error);
  }
}

/**
 * POST /contracts/detect-unusual
 * Detect unusual clauses in contract text using AI
 */
export async function detectUnusualClauses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { contractText } = req.body;

    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const unusualClauses = await contractService.detectUnusualClauses(contractText);
    sendSuccess(res, unusualClauses, 'Unusual clauses detected');
  } catch (error) {
    logger.error('[ContractController] detectUnusualClauses error', error);
    next(error);
  }
}

/**
 * POST /contracts/:id/ai-analysis
 * Perform comprehensive AI analysis on a contract
 */
export async function performAIAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { contractText } = req.body;

    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const analysis = await contractService.performAIAnalysis(id, contractText);
    sendSuccess(res, analysis, 'AI analysis completed');
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      sendError(res, 'Contract not found', 404);
      return;
    }
    logger.error('[ContractController] performAIAnalysis error', error);
    next(error);
  }
}

/**
 * POST /contracts/:id/reanalyze
 * Re-analyze contract with fresh AI analysis
 */
export async function reanalyzeContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { contractText } = req.body;

    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }
    if (!contractText) {
      sendError(res, 'Contract text is required', 400);
      return;
    }

    const contract = await contractService.reanalyzeContractWithAI(id, contractText);
    if (!contract) {
      sendError(res, 'Contract not found', 404);
      return;
    }

    sendSuccess(res, contract, 'Contract reanalyzed');
  } catch (error) {
    logger.error('[ContractController] reanalyzeContract error', error);
    next(error);
  }
}

// ============================================================================
// Export
// ============================================================================

/**
 * GET /contracts/:id/export/pdf
 * Export contract summary as PDF
 */
export async function exportPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      sendError(res, 'Contract ID is required', 400);
      return;
    }

    const pdfPath = await contractService.exportContractSummaryPDF(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contract_${id}_summary.pdf`);
    res.status(200).send(pdfPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      sendError(res, 'Contract not found', 404);
      return;
    }
    logger.error('[ContractController] exportPDF error', error);
    next(error);
  }
}
