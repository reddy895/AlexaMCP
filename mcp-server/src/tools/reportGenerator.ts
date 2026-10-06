import {
  GenerateReportInputSchema,
  InvestigationReport,
  EvidenceSource
} from '../schemas/tools.js';

export function generateReportTool(params: {
  verdict: InvestigationReport['verdict'];
  risk_score: number;
  confidence: InvestigationReport['confidence'];
  summary: string;
  evidence: string[];
  contradictions?: string[];
  uncertainties?: string[];
  recommendations: string[];
  sources?: EvidenceSource[];
}): InvestigationReport {
  let risk_level: InvestigationReport['risk_level'] = 'low';
  if (params.risk_score >= 80) {
    risk_level = 'critical';
  } else if (params.risk_score >= 55) {
    risk_level = 'high';
  } else if (params.risk_score >= 25) {
    risk_level = 'medium';
  }

  return {
    verdict: params.verdict,
    risk_score: Math.max(0, Math.min(100, params.risk_score)),
    confidence: params.confidence,
    risk_level,
    summary: params.summary,
    evidence: params.evidence,
    contradictions: params.contradictions || [],
    uncertainties: params.uncertainties || [],
    recommendations: params.recommendations,
    sources: params.sources || []
  };
}
