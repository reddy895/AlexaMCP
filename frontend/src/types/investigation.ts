export type VerdictType =
  | 'SUPPORTED'
  | 'LIKELY_TRUE'
  | 'UNCERTAIN'
  | 'MISLEADING'
  | 'LIKELY_FALSE'
  | 'SUSPICIOUS'
  | 'LIKELY_PHISHING';

export interface EvidenceSource {
  title: string;
  url: string;
  summary: string;
  source_type: 'official' | 'reputable' | 'independent';
  relevance?: 'high' | 'medium' | 'low';
}

export interface ToolCallLog {
  id: string;
  investigation_id: string;
  tool_name: string;
  status: 'success' | 'error' | 'failed';
  duration: number;
  result_summary: string;
  input_summary?: string;
  created_at: string;
}

export interface InvestigationResultData {
  verdict: VerdictType;
  risk_score: number;
  confidence: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  voice_summary?: string;
  recommendations: string[];
  evidence: string[];
  contradictions: string[];
  uncertainties: string[];
  claims: Array<{ text: string; type: string }>;
  sources: EvidenceSource[];
  tool_calls: ToolCallLog[];
}

export interface Investigation {
  id: string;
  input: string;
  type: string;
  status: 'started' | 'investigating' | 'completed' | 'failed';
  progress: number;
  stage: string;
  created_at: string;
  completed_at?: string;
  result?: InvestigationResultData;
  error?: string;
  // History summary fields
  verdict?: VerdictType;
  risk_score?: number;
  confidence?: 'low' | 'medium' | 'high';
}

export interface SystemHealth {
  backend: boolean;
  mcpServer: boolean;
  ollama: {
    available: boolean;
    version?: string;
    model: string;
    model_available: boolean;
  };
}
