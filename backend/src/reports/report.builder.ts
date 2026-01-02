import { Report, ReportMetadata, ReportSection } from './report.types';
import { Contract } from '../types/contract.types';
import { RiskAnalysis, RiskScore } from '../types/risk.types';

// Builds a report object from contract, risk, and score data
export function buildReport(params: {
  contract: Contract;
  risk: RiskAnalysis;
  score: RiskScore;
  createdBy: string;
  status?: ReportMetadata['status'];
  pdfUrl?: string;
}): Report {
  const metadata: ReportMetadata = {
    reportId: `${params.contract.id}-${Date.now()}`,
    contractId: params.contract.id,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
    status: params.status || 'draft',
  };

  const sections: ReportSection[] = [
    {
      title: 'Contract Overview',
      content: `Title: ${params.contract.title}\nStatus: ${params.contract.status}`,
    },
    {
      title: 'Risk Analysis',
      content: params.risk.summary,
    },
    {
      title: 'Risk Flags',
      content: params.risk.riskScore.flags.map(f => `${f.code}: ${f.description} (${f.severity})`).join('\n'),
    },
    {
      title: 'Score Breakdown',
      content: `Score: ${params.score.score}\nFlags: ${params.score.flags.length}`,
    },
  ];

  return {
    metadata,
    contract: params.contract,
    risk: params.risk,
    score: params.score,
    sections,
    ...(params.pdfUrl !== undefined && { pdfUrl: params.pdfUrl }),
  };
}
