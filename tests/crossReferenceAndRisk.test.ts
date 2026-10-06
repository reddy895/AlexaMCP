import { describe, it, expect } from 'vitest';
import { calculateRiskTool } from '../mcp-server/src/tools/riskCalculator';

describe('MCP Tool: calculate_risk (Transparent Scoring Algorithm)', () => {
  it('should calculate transparent high risk for multi-indicator phishing payload', () => {
    const result = calculateRiskTool({
      claims: [{ text: 'Account blocked today', type: 'security' }],
      url_findings: {
        url: 'https://fake-sbi.xyz/login',
        domain: 'fake-sbi.xyz',
        https: true,
        redirects: [],
        suspicious_indicators: ['Brand impersonation detected'],
        risk: 'high'
      },
      message_indicators: [
        { type: 'urgency', severity: 'high', evidence: 'Today immediately' },
        { type: 'credential_request', severity: 'high', evidence: 'Verify credentials' },
        { type: 'impersonation', severity: 'high', evidence: 'SBI' }
      ],
      cross_reference: {
        supported: [],
        contradicted: [
          { claim: 'Account blocked', status: 'CONTRADICTED', reason: 'Official policy denies this' }
        ],
        uncertain: [],
        missing_context: []
      }
    });

    // Score breakdown:
    // URL high risk: +25
    // Credential request: +25
    // Impersonation: +20
    // Urgency: +15
    // Contradiction: +20
    // Total = 105, clamped to 100
    expect(result.risk_score).toBe(100);
    expect(result.risk_level).toBe('critical');
    expect(result.confidence).toBe('high');
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });

  it('should clamp scores strictly between 0 and 100', () => {
    const result = calculateRiskTool({
      claims: [],
      message_indicators: []
    });

    expect(result.risk_score).toBe(0);
    expect(result.risk_level).toBe('low');
  });

  it('should calculate high risk for employment upfront fee scam', () => {
    const result = calculateRiskTool({
      claims: [{ text: 'Pay ₹999 for interview', type: 'job' }],
      message_indicators: [
        { type: 'fee_for_job', severity: 'high', evidence: 'Pay ₹999' },
        { type: 'impersonation', severity: 'high', evidence: 'Amazon' }
      ]
    });

    // Upfront fee: +25, Impersonation: +20 -> 45
    expect(result.risk_score).toBeGreaterThanOrEqual(45);
    expect(result.reasons.some(r => r.includes('Upfront Fee'))).toBe(true);
  });
});
