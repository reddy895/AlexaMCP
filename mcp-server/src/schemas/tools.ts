import { z } from 'zod';

export const ClaimTypeSchema = z.enum([
  'financial',
  'security',
  'product',
  'news',
  'job',
  'identity',
  'other'
]);

export const ClaimSchema = z.object({
  text: z.string().min(1),
  type: ClaimTypeSchema
});

export const ExtractClaimsInputSchema = z.object({
  content: z.string().min(1).max(20000)
});

export const ExtractClaimsOutputSchema = z.object({
  claims: z.array(ClaimSchema)
});

export const InspectUrlInputSchema = z.object({
  url: z.string().min(1).max(2048)
});

export const InspectUrlOutputSchema = z.object({
  url: z.string(),
  domain: z.string(),
  https: z.boolean(),
  redirects: z.array(z.string()),
  suspicious_indicators: z.array(z.string()),
  risk: z.enum(['low', 'medium', 'high']),
  metadata: z.record(z.any()).optional()
});

export const MessageIndicatorTypeSchema = z.enum([
  'urgency',
  'threat',
  'impersonation',
  'financial_request',
  'credential_request',
  'suspicious_instructions',
  'social_engineering',
  'emotional_manipulation',
  'unusual_language',
  'fee_for_job',
  'unrealistic_claims'
]);

export const MessageIndicatorSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  evidence: z.string()
});

export const AnalyzeMessageInputSchema = z.object({
  content: z.string().min(1).max(20000)
});

export const AnalyzeMessageOutputSchema = z.object({
  indicators: z.array(MessageIndicatorSchema),
  message_type: z.string().optional()
});

export const EvidenceSourceTypeSchema = z.enum(['official', 'reputable', 'independent']);

export const EvidenceSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  summary: z.string(),
  source_type: EvidenceSourceTypeSchema,
  relevance: z.enum(['high', 'medium', 'low']).optional()
});

export const SearchEvidenceInputSchema = z.object({
  query: z.string().min(1).max(500),
  claim: z.string().optional(),
  domain: z.string().optional()
});

export const SearchEvidenceOutputSchema = z.object({
  status: z.enum(['found', 'insufficient_evidence']),
  sources: z.array(EvidenceSourceSchema)
});

export const CrossReferenceInputSchema = z.object({
  claims: z.array(ClaimSchema),
  url_findings: InspectUrlOutputSchema.optional(),
  message_indicators: z.array(MessageIndicatorSchema).optional(),
  external_evidence: z.array(EvidenceSourceSchema).optional()
});

export const CrossReferenceItemSchema = z.object({
  claim: z.string(),
  status: z.enum(['SUPPORTED', 'CONTRADICTED', 'UNCERTAIN', 'INSUFFICIENT_EVIDENCE']),
  reason: z.string(),
  source: z.string().optional()
});

export const CrossReferenceOutputSchema = z.object({
  supported: z.array(CrossReferenceItemSchema),
  contradicted: z.array(CrossReferenceItemSchema),
  uncertain: z.array(CrossReferenceItemSchema),
  missing_context: z.array(z.string())
});

export const CalculateRiskInputSchema = z.object({
  claims: z.array(ClaimSchema).optional().default([]),
  url_findings: InspectUrlOutputSchema.optional(),
  message_indicators: z.array(MessageIndicatorSchema).optional().default([]),
  cross_reference: CrossReferenceOutputSchema.optional(),
  evidence: z.array(EvidenceSourceSchema).optional().default([])
});

export const CalculateRiskOutputSchema = z.object({
  risk_score: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  reasons: z.array(z.string())
});

export const InvestigationVerdictSchema = z.enum([
  'SUPPORTED',
  'LIKELY_TRUE',
  'UNCERTAIN',
  'MISLEADING',
  'LIKELY_FALSE',
  'SUSPICIOUS',
  'LIKELY_PHISHING'
]);

export const GenerateReportInputSchema = z.object({
  verdict: InvestigationVerdictSchema,
  risk_score: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  evidence: z.array(z.string()),
  contradictions: z.array(z.string()).optional().default([]),
  uncertainties: z.array(z.string()).optional().default([]),
  recommendations: z.array(z.string()),
  sources: z.array(EvidenceSourceSchema).optional().default([])
});

export const InvestigationReportSchema = z.object({
  verdict: InvestigationVerdictSchema,
  risk_score: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string(),
  evidence: z.array(z.string()),
  contradictions: z.array(z.string()),
  uncertainties: z.array(z.string()),
  recommendations: z.array(z.string()),
  sources: z.array(EvidenceSourceSchema)
});

export type Claim = z.infer<typeof ClaimSchema>;
export type InspectUrlOutput = z.infer<typeof InspectUrlOutputSchema>;
export type MessageIndicator = z.infer<typeof MessageIndicatorSchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type CrossReferenceOutput = z.infer<typeof CrossReferenceOutputSchema>;
export type CalculateRiskOutput = z.infer<typeof CalculateRiskOutputSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
