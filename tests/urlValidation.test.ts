import { describe, it, expect } from 'vitest';
import { inspectUrlTool } from '../mcp-server/src/tools/urlInspector';

describe('MCP Tool: inspect_url', () => {
  it('should detect invalid URLs safely without crashing', async () => {
    const result = await inspectUrlTool('not-a-valid:::url%%%');
    expect(result.domain).toBe('invalid-url');
    expect(result.risk).toBe('high');
    expect(result.suspicious_indicators.length).toBeGreaterThan(0);
  });

  it('should detect brand impersonation in phishing URLs', async () => {
    const result = await inspectUrlTool('https://sbi-account-verify-security.xyz/login');
    expect(result.https).toBe(true);
    expect(result.domain).toContain('sbi-account-verify-security.xyz');
    expect(result.risk).toBe('high');

    const hasImpersonation = result.suspicious_indicators.some(i => i.includes('impersonation'));
    const hasTld = result.suspicious_indicators.some(i => i.includes('TLD'));
    expect(hasImpersonation || hasTld).toBe(true);
  });

  it('should detect insecure HTTP protocol', async () => {
    const result = await inspectUrlTool('http://insecure-bank-login.com');
    expect(result.https).toBe(false);
    expect(result.suspicious_indicators.some(i => i.includes('Insecure protocol'))).toBe(true);
  });

  it('should recognize official legitimate domains with low risk', async () => {
    const result = await inspectUrlTool('https://www.amazon.com/dp/B08N5WRWNW');
    expect(result.https).toBe(true);
    expect(result.domain).toBe('www.amazon.com');
    expect(result.suspicious_indicators.some(i => i.includes('impersonation'))).toBe(false);
  });
});
