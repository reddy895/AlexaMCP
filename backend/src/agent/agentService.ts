import { db } from '../database/db.js';
import { mcpClient } from '../services/mcpClient.js';
import { ollamaService } from '../services/ollamaService.js';
import crypto from 'crypto';
import { z } from 'zod';

export interface InvestigationStatus {
  id: string;
  input: string;
  type: string;
  status: 'started' | 'investigating' | 'completed' | 'failed';
  progress: number;
  stage: string;
  created_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export class AgentService {
  /**
   * Starts an asynchronous investigation and updates status as MCP tools run.
   */
  async startInvestigation(content: string): Promise<string> {
    const id = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const detectedType = this.detectInvestigationType(content);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO investigations (id, input, type, status, stage, progress, created_at)
      VALUES (?, ?, ?, 'started', 'Initializing investigation', 5, ?)
    `);
    insertStmt.run(id, content, detectedType, now);

    // Launch background investigation pipeline
    this.runInvestigationPipeline(id, content, detectedType).catch(err => {
      console.error(`[AgentService] Pipeline error for ${id}:`, err);
      this.updateStatus(id, 'failed', 100, 'Investigation failed', undefined, err.message);
    });

    return id;
  }

  private detectInvestigationType(content: string): string {
    const lower = content.toLowerCase();
    if (lower.startsWith('http') || (lower.includes('://') && lower.split(/\s+/).length <= 2)) {
      return 'suspicious_url';
    }
    if (lower.includes('job') || lower.includes('interview') || lower.includes('hiring') || lower.includes('salary') || lower.includes('recruitment')) {
      return 'scam_job_offer';
    }
    if (lower.includes('lifespan') || lower.includes('cure') || lower.includes('study') || lower.includes('scientist')) {
      return 'product_or_viral_claim';
    }
    if (lower.includes('subject:') || lower.includes('from:') || lower.includes('dear customer') || lower.includes('dear user')) {
      return 'suspicious_email_text';
    }
    if (lower.includes('domain') || lower.includes('website') || lower.includes('.com') || lower.includes('.in') || lower.includes('.org')) {
      return 'website_legitimacy';
    }
    return 'suspicious_message';
  }

  private updateStatus(
    id: string,
    status: 'started' | 'investigating' | 'completed' | 'failed',
    progress: number,
    stage: string,
    completedAt?: string,
    error?: string
  ) {
    try {
      const stmt = db.prepare(`
        UPDATE investigations
        SET status = ?, progress = ?, stage = ?, completed_at = COALESCE(?, completed_at)
        WHERE id = ?
      `);
      stmt.run(status, progress, stage, completedAt || null, id);
    } catch (err: any) {
      console.error('[AgentService] Failed to update investigation status:', err.message);
    }
  }

  private async runInvestigationPipeline(id: string, content: string, investigationType: string) {
    // 1. STEP: Extract Claims
    this.updateStatus(id, 'investigating', 15, 'Extracting factual claims');
    const claimsResult = await mcpClient.executeTool<{ claims: Array<{ text: string; type: string }> }>(
      id,
      'extract_claims',
      { content }
    );
    const claims = claimsResult?.claims || [];

    // Save claims to database
    const claimInsert = db.prepare(`INSERT INTO claims (id, investigation_id, text, type) VALUES (?, ?, ?, ?)`);
    for (const claim of claims) {
      claimInsert.run(`CLM-${crypto.randomUUID().slice(0, 8)}`, id, claim.text, claim.type);
    }

    // 2. STEP: Inspect URL (if any URL present in text)
    this.updateStatus(id, 'investigating', 30, 'Inspecting destination URL & domain security');
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+/i) || content.match(/[a-zA-Z0-9-]+\.(?:com|org|net|in|info|xyz|top|site|biz|live|io|co)[^\s]*/i);
    let urlFindings: any = null;

    if (urlMatch) {
      let rawUrl = urlMatch[0];
      if (!rawUrl.startsWith('http')) rawUrl = 'https://' + rawUrl;
      urlFindings = await mcpClient.executeTool(id, 'inspect_url', { url: rawUrl });
    }

    // 3. STEP: Analyze Message
    this.updateStatus(id, 'investigating', 45, 'Analyzing linguistic indicators & threat patterns');
    const messageAnalysis = await mcpClient.executeTool<{ indicators: any[]; message_type: string }>(
      id,
      'analyze_message',
      { content }
    );
    const indicators = messageAnalysis?.indicators || [];

    // 4. STEP: Search Evidence
    this.updateStatus(id, 'investigating', 60, 'Searching verified independent evidence & official advisories');
    const query = claims.length > 0 ? claims[0].text : content.slice(0, 100);
    const evidenceResult = await mcpClient.executeTool<{ status: string; sources: any[] }>(
      id,
      'search_evidence',
      {
        query,
        claim: claims.map(c => c.text).join(' '),
        domain: urlFindings?.domain
      }
    );
    const sources = evidenceResult?.sources || [];

    // Save evidence sources to database
    const evInsert = db.prepare(`
      INSERT INTO evidence (id, investigation_id, source, title, url, summary, classification)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const src of sources) {
      evInsert.run(
        `EV-${crypto.randomUUID().slice(0, 8)}`,
        id,
        src.source_type,
        src.title,
        src.url,
        src.summary,
        src.source_type
      );
    }

    // 5. STEP: Cross Reference
    this.updateStatus(id, 'investigating', 75, 'Cross-referencing claims against gathered evidence');
    const crossRefResult = await mcpClient.executeTool<{
      supported: any[];
      contradicted: any[];
      uncertain: any[];
      missing_context: string[];
    }>(id, 'cross_reference', {
      claims,
      url_findings: urlFindings,
      message_indicators: indicators,
      external_evidence: sources
    });

    // 6. STEP: Calculate Risk
    this.updateStatus(id, 'investigating', 85, 'Calculating transparent risk score');
    const riskResult = await mcpClient.executeTool<{
      risk_score: number;
      confidence: 'low' | 'medium' | 'high';
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      reasons: string[];
    }>(id, 'calculate_risk', {
      claims,
      url_findings: urlFindings,
      message_indicators: indicators,
      cross_reference: crossRefResult,
      evidence: sources
    });

    // 7. STEP: Ollama AI Reasoning & Report Synthesis
    this.updateStatus(id, 'investigating', 92, 'Synthesizing forensic investigation verdict with Ollama');

    // Build evidence payload for Ollama reasoning
    const reasoningPrompt = `
INVESTIGATION CONTEXT:
Input content: "${content}"
Extracted Claims: ${JSON.stringify(claims)}
URL Findings: ${JSON.stringify(urlFindings || 'No URL')}
Message Indicators: ${JSON.stringify(indicators)}
Independent Sources Found: ${JSON.stringify(sources)}
Cross Reference Output: ${JSON.stringify(crossRefResult)}
Algorithmic Risk Score: ${riskResult.risk_score} / 100 (${riskResult.risk_level})
Algorithmic Reasons: ${JSON.stringify(riskResult.reasons)}

TASK:
Reason over the verified evidence gathered above.
Synthesize a concise, forensic investigation report.
Choose the verdict from:
- LIKELY_PHISHING (if phishing/scam/credential theft/impersonation)
- SUSPICIOUS (if questionable, unverified fee, or deceptive intent)
- LIKELY_FALSE (if factually refuted by official evidence)
- MISLEADING (if exaggerated or distorted)
- UNCERTAIN (if evidence is inconclusive or insufficient)
- SUPPORTED (if corroborated by official authoritative sources)
- LIKELY_TRUE (if highly plausible and verified)

Respond with valid JSON matching:
{
  "verdict": "string",
  "summary": "1-3 clear sentences summarizing the finding and why",
  "voice_summary": "Concise Alexa-style response (2-4 natural sentences suitable for text-to-speech voice readout)",
  "evidence": ["list of key findings"],
  "contradictions": ["list of contradictions"],
  "uncertainties": ["list of uncertainties or missing details"],
  "recommendations": ["clear, actionable steps for the user"]
}
`;

    const ReasoningSchema = z.object({
      verdict: z.string(),
      summary: z.string(),
      voice_summary: z.string(),
      evidence: z.array(z.string()),
      contradictions: z.array(z.string()).optional().default([]),
      uncertainties: z.array(z.string()).optional().default([]),
      recommendations: z.array(z.string())
    });

    const reasoning = await ollamaService.reasonOverEvidence(reasoningPrompt, ReasoningSchema);

    // Determine final verdict
    let finalVerdict: any = 'UNCERTAIN';
    let summary = '';
    let voiceSummary = '';
    let evidenceList: string[] = [];
    let contradictionsList: string[] = [];
    let uncertaintiesList: string[] = [];
    let recommendationsList: string[] = [];

    if (reasoning.data) {
      const v = reasoning.data.verdict.toUpperCase().replace(/\s+/g, '_');
      finalVerdict = [
        'LIKELY_PHISHING',
        'SUSPICIOUS',
        'LIKELY_FALSE',
        'MISLEADING',
        'UNCERTAIN',
        'SUPPORTED',
        'LIKELY_TRUE'
      ].includes(v)
        ? v
        : riskResult.risk_score >= 80
        ? 'LIKELY_PHISHING'
        : riskResult.risk_score >= 55
        ? 'SUSPICIOUS'
        : 'UNCERTAIN';

      summary = reasoning.data.summary;
      voiceSummary = reasoning.data.voice_summary;
      evidenceList = reasoning.data.evidence;
      contradictionsList = reasoning.data.contradictions || [];
      uncertaintiesList = reasoning.data.uncertainties || [];
      recommendationsList = reasoning.data.recommendations;
    } else {
      // Deterministic fallback if Ollama is unavailable
      if (riskResult.risk_score >= 80) {
        finalVerdict = 'LIKELY_PHISHING';
        summary = `High risk detected (${riskResult.risk_score}/100). The submitted content matches known phishing tactics including impersonation, urgency language, and credential harvesting.`;
        voiceSummary = `I investigated the message. It is likely phishing with a ${riskResult.risk_score}% risk score. The biggest warning signs are the urgent language, impersonation, and request for verification. I recommend not opening any link.`;
        recommendationsList = ['Do not open any attached links', 'Do not enter passwords or OTPs', 'Delete or report the message to official authorities'];
      } else if (riskResult.risk_score >= 55) {
        finalVerdict = 'SUSPICIOUS';
        summary = `Suspicious activity detected (${riskResult.risk_score}/100). Deceptive patterns such as upfront fee solicitation or unverified claims were identified.`;
        voiceSummary = `I investigated this claim. It looks suspicious with a risk score of ${riskResult.risk_score} out of 100. Legitimate organizations do not request upfront payments. Do not transfer funds.`;
        recommendationsList = ['Verify directly via official corporate portals', 'Never pay fees for recruitment or job interviews'];
      } else if (crossRefResult.contradicted.length > 0) {
        finalVerdict = 'LIKELY_FALSE';
        summary = `Independent authoritative sources contradict the submitted claims.`;
        voiceSummary = `I investigated this claim. Authoritative sources contradict it. I recommend treating this claim as misleading or false.`;
        recommendationsList = ['Rely on peer-reviewed science or official public registries'];
      } else {
        finalVerdict = 'UNCERTAIN';
        summary = `Evidence is insufficient to confirm or refute the claim definitively.`;
        voiceSummary = `I investigated this claim, but available independent evidence is currently insufficient to verify or refute it. Exercise caution.`;
        recommendationsList = ['Check primary sources directly before sharing or taking action'];
      }

      evidenceList = riskResult.reasons;
      contradictionsList = crossRefResult.contradicted.map(c => c.reason);
      uncertaintiesList = crossRefResult.uncertain.map(u => u.reason);
    }

    // 8. STEP: Generate Structured Final Report via MCP Tool
    this.updateStatus(id, 'investigating', 98, 'Finalizing structured report');
    const finalReport = await mcpClient.executeTool(id, 'generate_investigation_report', {
      verdict: finalVerdict,
      risk_score: riskResult.risk_score,
      confidence: riskResult.confidence,
      summary,
      evidence: evidenceList,
      contradictions: contradictionsList,
      uncertainties: uncertaintiesList,
      recommendations: recommendationsList,
      sources
    });

    // Save final report to database
    const reportInsert = db.prepare(`
      INSERT OR REPLACE INTO reports (
        id, investigation_id, verdict, risk_score, confidence, risk_level, summary,
        voice_summary, recommendations, evidence_json, contradictions_json, uncertainties_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    reportInsert.run(
      `REP-${crypto.randomUUID().slice(0, 8)}`,
      id,
      finalReport.verdict,
      finalReport.risk_score,
      finalReport.confidence,
      finalReport.risk_level,
      finalReport.summary,
      voiceSummary,
      JSON.stringify(finalReport.recommendations),
      JSON.stringify(finalReport.evidence),
      JSON.stringify(finalReport.contradictions),
      JSON.stringify(finalReport.uncertainties),
      now
    );

    this.updateStatus(id, 'completed', 100, 'Investigation completed', now);
  }

  getInvestigation(id: string): InvestigationStatus | null {
    const inv = db.prepare('SELECT * FROM investigations WHERE id = ?').get(id) as any;
    if (!inv) return null;

    let result = null;
    if (inv.status === 'completed') {
      const report = db.prepare('SELECT * FROM reports WHERE investigation_id = ?').get(id) as any;
      const claims = db.prepare('SELECT * FROM claims WHERE investigation_id = ?').all(id) as any[];
      const evidence = db.prepare('SELECT * FROM evidence WHERE investigation_id = ?').all(id) as any[];
      const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE investigation_id = ? ORDER BY created_at ASC').all(id) as any[];

      if (report) {
        result = {
          verdict: report.verdict,
          risk_score: report.risk_score,
          confidence: report.confidence,
          risk_level: report.risk_level,
          summary: report.summary,
          voice_summary: report.voice_summary,
          recommendations: JSON.parse(report.recommendations || '[]'),
          evidence: JSON.parse(report.evidence_json || '[]'),
          contradictions: JSON.parse(report.contradictions_json || '[]'),
          uncertainties: JSON.parse(report.uncertainties_json || '[]'),
          claims,
          sources: evidence,
          tool_calls: toolCalls
        };
      }
    }

    return {
      id: inv.id,
      input: inv.input,
      type: inv.type,
      status: inv.status,
      progress: inv.progress,
      stage: inv.stage,
      created_at: inv.created_at,
      completed_at: inv.completed_at,
      result
    };
  }

  getActivity(id: string) {
    const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE investigation_id = ? ORDER BY created_at ASC').all(id);
    return toolCalls;
  }

  getReport(id: string) {
    const inv = this.getInvestigation(id);
    return inv?.result || null;
  }

  listInvestigations(limit = 20) {
    const rows = db.prepare(`
      SELECT i.*, r.verdict, r.risk_score, r.confidence
      FROM investigations i
      LEFT JOIN reports r ON i.id = r.investigation_id
      ORDER BY i.created_at DESC
      LIMIT ?
    `).all(limit);
    return rows;
  }
}

export const agentService = new AgentService();
