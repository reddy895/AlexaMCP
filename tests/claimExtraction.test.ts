import { describe, it, expect } from 'vitest';
import { extractClaimsFromContent } from '../mcp-server/src/tools/claimExtractor';

describe('MCP Tool: extract_claims', () => {
  it('should extract financial and security claims from bank alert message', () => {
    const input = 'Your SBI account will be blocked today. Verify immediately with KYC.';
    const result = extractClaimsFromContent(input);

    expect(result.claims).toBeDefined();
    expect(result.claims.length).toBeGreaterThan(0);

    const hasSecurity = result.claims.some(c => c.type === 'security' || c.type === 'financial');
    expect(hasSecurity).toBe(true);
    expect(result.claims[0].text).toContain('account will be blocked');
  });

  it('should extract job and fee claims from employment text', () => {
    const input = 'Amazon is offering a software engineer job. Pay ₹999 to register for the interview.';
    const result = extractClaimsFromContent(input);

    expect(result.claims.length).toBeGreaterThanOrEqual(1);
    const jobClaim = result.claims.find(c => c.type === 'job');
    expect(jobClaim).toBeDefined();
  });

  it('should extract scientific/health claim', () => {
    const input = 'Scientists have discovered that drinking coffee increases lifespan by exactly 40%.';
    const result = extractClaimsFromContent(input);

    expect(result.claims.length).toBeGreaterThanOrEqual(1);
    expect(result.claims[0].type).toBe('product');
  });

  it('should handle single-line input gracefully without inventing claims', () => {
    const input = 'Suspicious link sent by an unknown contact.';
    const result = extractClaimsFromContent(input);

    expect(result.claims.length).toBe(1);
    expect(result.claims[0].text).toContain('Suspicious link sent by an unknown contact');
  });
});
