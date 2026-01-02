// Scan service: orchestrates contract scanning, AI analysis, and risk detection
import * as scanRepository from '../repositories/scan.repository';
import { ScanRequest, ScanResult, ScanMetadata, ScanStatus } from '../types/scan.types';
import { RiskFlag } from '../types/risk.types';
import { callAI } from '../ai/ai.client';
import { parseAIJson } from '../ai/ai.parser';
import { mapClauses, mapRiskFlags, mapUnusualClauses } from '../ai/ai.mapper';
import { CLAUSE_EXTRACTION_PROMPT } from '../ai/prompts/clauseExtraction.prompt';
import { RISK_EXPLANATION_PROMPT } from '../ai/prompts/riskExplanation.prompt';
import { UNUSUAL_CLAUSE_PROMPT } from '../ai/prompts/unusualClause.prompt';
import { applyStateRules } from './stateRules.service';

interface ScanOptions {
  extractClauses?: boolean;
  detectRisks?: boolean;
  detectUnusualClauses?: boolean;
  applyStateRules?: boolean;
  state?: string;
}

interface ScanProgress {
  scanId: string;
  status: ScanStatus;
  progress: number;
  currentStep: string;
  steps: string[];
}

const scanProgressStore: Map<string, ScanProgress> = new Map();

function updateProgress(scanId: string, step: string, progress: number) {
  const current = scanProgressStore.get(scanId);
  if (current) {
    current.currentStep = step;
    current.progress = progress;
    current.steps.push(`${new Date().toISOString()}: ${step}`);
  }
}

export async function createScanRequest(data: Omit<ScanRequest, 'id' | 'requestedAt'>): Promise<ScanRequest> {
  const scan: ScanRequest = {
    ...data,
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requestedAt: new Date().toISOString(),
  };
  
  scanProgressStore.set(scan.id, {
    scanId: scan.id,
    status: 'pending',
    progress: 0,
    currentStep: 'Initializing',
    steps: ['Scan request created'],
  });
  
  return scanRepository.create(scan);
}

export async function getScanById(id: string): Promise<ScanRequest | null> {
  return scanRepository.findById(id);
}

export async function getScanProgress(scanId: string): Promise<ScanProgress | null> {
  return scanProgressStore.get(scanId) || null;
}

export async function updateScan(id: string, updates: Partial<ScanRequest>): Promise<ScanRequest | null> {
  return scanRepository.update(id, updates);
}

export async function deleteScan(id: string): Promise<boolean> {
  scanProgressStore.delete(id);
  return scanRepository.deleteScan(id);
}

export async function executeScan(
  scanId: string,
  contractText: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const startTime = Date.now();
  const findings: string[] = [];
  const allFlags: RiskFlag[] = [];
  const errors: string[] = [];

  try {
    updateProgress(scanId, 'Starting scan', 10);

    // Step 1: Extract clauses with AI
    if (options.extractClauses !== false) {
      updateProgress(scanId, 'Extracting clauses', 20);
      try {
        const clausePrompt = CLAUSE_EXTRACTION_PROMPT.replace('{{contractText}}', contractText);
        const clauseResponse = await callAI({ prompt: clausePrompt, provider: 'openai' });
        const parsedClauses = parseAIJson(clauseResponse.raw);
        
        if (parsedClauses) {
          const clauses = mapClauses(parsedClauses);
          findings.push(`Extracted ${clauses.length} clauses`);
          
          const flaggedClauses = clauses.filter(c => c.flagged);
          if (flaggedClauses.length > 0) {
            findings.push(`${flaggedClauses.length} clauses flagged for review`);
          }
        }
      } catch (err) {
        errors.push(`Clause extraction failed: ${err}`);
      }
    }

    // Step 2: Detect risks
    if (options.detectRisks !== false) {
      updateProgress(scanId, 'Detecting risks', 40);
      try {
        const riskPrompt = RISK_EXPLANATION_PROMPT.replace('{{contractText}}', contractText);
        const riskResponse = await callAI({ prompt: riskPrompt, provider: 'openai' });
        const parsedRisks = parseAIJson(riskResponse.raw);
        
        if (parsedRisks) {
          const flags = mapRiskFlags(parsedRisks);
          allFlags.push(...flags);
          findings.push(`Detected ${flags.length} potential risks`);
        }
      } catch (err) {
        errors.push(`Risk detection failed: ${err}`);
      }
    }

    // Step 3: Detect unusual clauses
    if (options.detectUnusualClauses !== false) {
      updateProgress(scanId, 'Detecting unusual clauses', 60);
      try {
        const unusualPrompt = UNUSUAL_CLAUSE_PROMPT.replace('{{contractText}}', contractText);
        const unusualResponse = await callAI({ prompt: unusualPrompt, provider: 'openai' });
        const parsedUnusual = parseAIJson(unusualResponse.raw);
        
        if (parsedUnusual) {
          const unusual = mapUnusualClauses(parsedUnusual);
          if (unusual.length > 0) {
            findings.push(`Found ${unusual.length} unusual clauses`);
            allFlags.push(...unusual.map((u, i) => ({
              code: `UNUSUAL_CLAUSE_${i + 1}`,
              description: `${u.text.slice(0, 50)}... - ${u.reason}`,
              severity: 'medium' as const,
            })));
          }
        }
      } catch (err) {
        errors.push(`Unusual clause detection failed: ${err}`);
      }
    }

    // Step 4: Apply state-specific rules
    if (options.applyStateRules && options.state) {
      updateProgress(scanId, `Applying ${options.state} state rules`, 80);
      try {
        const stateFlags = await applyStateRules(scanId, options.state);
        allFlags.push(...stateFlags);
        findings.push(`Applied ${options.state} state rules: ${stateFlags.length} issues found`);
      } catch (err) {
        errors.push(`State rules check failed: ${err}`);
      }
    }

    // Step 5: Calculate final score
    updateProgress(scanId, 'Calculating risk score', 90);
    const criticalCount = allFlags.filter(f => f.severity === 'critical').length;
    const highCount = allFlags.filter(f => f.severity === 'high').length;
    const mediumCount = allFlags.filter(f => f.severity === 'medium').length;
    const lowCount = allFlags.filter(f => f.severity === 'low').length;
    
    const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2));

    updateProgress(scanId, 'Scan complete', 100);
    
    const progress = scanProgressStore.get(scanId);
    if (progress) {
      progress.status = 'completed';
    }

    const duration = Date.now() - startTime;
    findings.push(`Scan completed in ${duration}ms`);

    return {
      id: `result_${scanId}`,
      scanId,
      findings,
      score,
      completedAt: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (err) {
    const progress = scanProgressStore.get(scanId);
    if (progress) {
      progress.status = 'failed';
    }
    
    return {
      id: `result_${scanId}`,
      scanId,
      findings: [],
      score: 0,
      completedAt: new Date().toISOString(),
      errors: [`Scan failed: ${err}`],
    };
  }
}

export async function getRecentScans(userId: string, limit = 10): Promise<ScanMetadata[]> {
  const allScans = await scanRepository.findAll();
  return allScans
    .filter(s => s.requestedBy === userId)
    .slice(-limit)
    .map(s => ({
      scanId: s.id,
      status: scanProgressStore.get(s.id)?.status || 'pending',
      requestedBy: s.requestedBy,
      requestedAt: s.requestedAt,
    }));
}

export async function retryFailedScan(scanId: string, contractText: string): Promise<ScanResult> {
  const scan = await getScanById(scanId);
  if (!scan) {
    throw new Error('Scan not found');
  }
  
  // Reset progress
  scanProgressStore.set(scanId, {
    scanId,
    status: 'pending',
    progress: 0,
    currentStep: 'Retrying',
    steps: ['Retry initiated'],
  });
  
  return executeScan(scanId, contractText, scan.options);
}
