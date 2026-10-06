import { describe, it, expect } from 'vitest';
import { analyzeMessageTool } from '../mcp-server/src/tools/messageAnalyzer';

describe('MCP Tool: analyze_message', () => {
  it('should detect urgency, threat, and credential requests in phishing alert', () => {
    const input = 'Your SBI account will be blocked today. Verify immediately: update KYC now!';
    const result = analyzeMessageTool(input);

    expect(result.indicators.length).toBeGreaterThanOrEqual(3);

    const types = result.indicators.map(i => i.type);
    expect(types).toContain('urgency');
    expect(types).toContain('threat');
    expect(types).toContain('impersonation');
    expect(result.message_type).toBe('phishing_impersonation');
  });

  it('should detect recruitment upfront payment scam', () => {
    const input = 'Amazon is offering a software engineer job. Pay ₹999 to register for the interview.';
    const result = analyzeMessageTool(input);

    const types = result.indicators.map(i => i.type);
    expect(types).toContain('fee_for_job');
    expect(result.message_type).toBe('recruitment_scam');
  });

  it('should detect unrealistic claims in health exaggeration', () => {
    const input = 'Scientists discovered a miracle drink that increases lifespan by 40%.';
    const result = analyzeMessageTool(input);

    const types = result.indicators.map(i => i.type);
    expect(types).toContain('unrealistic_claims');
  });

  it('should return empty indicators for benign text', () => {
    const input = 'Meeting is rescheduled for tomorrow at 3 PM in the second floor conference room.';
    const result = analyzeMessageTool(input);

    expect(result.indicators.length).toBe(0);
    expect(result.message_type).toBe('general_claim');
  });
});
