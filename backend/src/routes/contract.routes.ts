// Contract routes: CRUD, analysis, AI operations, and export endpoints
import { Router } from 'express';
import * as contractController from '../controllers/contract.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All contract routes require authentication
router.use(authenticate);

// ============================================================================
// Search (must come before /:id routes)
// ============================================================================

/**
 * GET /contracts/search
 * Search contracts by title or status
 */
router.get('/search', contractController.searchContracts);

// ============================================================================
// AI Operations (non-ID routes)
// ============================================================================

/**
 * POST /contracts/summary
 * Generate AI-powered summary of contract text
 */
router.post('/summary', contractController.generateSummary);

/**
 * POST /contracts/detect-unusual
 * Detect unusual clauses in contract text using AI
 */
router.post('/detect-unusual', contractController.detectUnusualClauses);

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * POST /contracts
 * Create a new contract
 */
router.post('/', contractController.createContract);

/**
 * GET /contracts
 * Get all contracts
 */
router.get('/', contractController.getAllContracts);

/**
 * GET /contracts/:id
 * Get a contract by ID
 */
router.get('/:id', contractController.getContract);

/**
 * PUT /contracts/:id
 * Update a contract
 */
router.put('/:id', contractController.updateContract);

/**
 * DELETE /contracts/:id
 * Delete a contract
 */
router.delete('/:id', contractController.deleteContract);

// ============================================================================
// Status Management
// ============================================================================

/**
 * POST /contracts/:id/submit
 * Submit a contract for review
 */
router.post('/:id/submit', contractController.submitContract);

/**
 * POST /contracts/:id/archive
 * Archive a contract
 */
router.post('/:id/archive', contractController.archiveContract);

// ============================================================================
// Analysis & AI Operations
// ============================================================================

/**
 * GET /contracts/:id/analyze
 * Analyze a contract and return summary
 */
router.get('/:id/analyze', contractController.analyzeContract);

/**
 * POST /contracts/:id/extract-clauses
 * Extract clauses from contract text using AI
 */
router.post('/:id/extract-clauses', contractController.extractClauses);

/**
 * POST /contracts/:id/ai-analysis
 * Perform comprehensive AI analysis on a contract
 */
router.post('/:id/ai-analysis', contractController.performAIAnalysis);

/**
 * POST /contracts/:id/reanalyze
 * Re-analyze contract with fresh AI analysis
 */
router.post('/:id/reanalyze', contractController.reanalyzeContract);

// ============================================================================
// Export
// ============================================================================

/**
 * GET /contracts/:id/export/pdf
 * Export contract summary as PDF
 */
router.get('/:id/export/pdf', contractController.exportPDF);

export default router;
