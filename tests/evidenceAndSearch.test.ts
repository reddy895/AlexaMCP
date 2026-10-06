import { describe, it, expect } from 'vitest';
import { searchEvidenceTool } from '../mcp-server/src/tools/evidenceSearcher';
import { crossReferenceTool } from '../mcp-server/src/tools/crossReferencer';

describe('MCP Tool: search_evidence & cross_reference', () => {
  it('should retrieve official banking security advisory for phishing keywords', async () => {
    const result = await searchEvidenceTool({
      query: 'SBI account blocked KYC verify link',
      claim: 'Your SBI account will be blocked today'
    });

    expect(result.status).toBe('found');
    expect(result.sources.length).toBeGreaterThan(0);

    const officialSource = result.sources.find(s => s.source_type === 'official');
    expect(officialSource).toBeDefined();
    expect(officialSource?.summary.toLowerCase()).toContain('never');
  });

  it('should retrieve official recruitment advisory for Amazon fee scam', async () => {
    const result = await searchEvidenceTool({
      query: 'Amazon job interview pay fee 999 recruitment',
      claim: 'Pay ₹999 to register for Amazon interview'
    });

    expect(result.status).toBe('found');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].summary.toLowerCase()).toContain('does not charge');
  });

  it('should return insufficient_evidence for completely random nonsense query', async () => {
    const result = await searchEvidenceTool({
      query: 'xyzabcuvw12345nonexistentunicornclaim9876543210'
    });

    expect(result.status).toBe('insufficient_evidence');
    expect(result.sources.length).toBe(0);
  });

  it('should correctly classify contradiction in cross_reference', () => {
    const result = crossReferenceTool({
      claims: [
        { text: 'Your SBI account will be blocked today. Verify using link.', type: 'security' }
      ],
      url_findings: {
        url: 'https://fake-sbi-portal.xyz/login',
        domain: 'fake-sbi-portal.xyz',
        https: true,
        redirects: [],
        suspicious_indicators: ['Brand impersonation detected: Domain contains sbi but is not official'],
        risk: 'high'
      },
      message_indicators: [
        { type: 'urgency', severity: 'high', evidence: 'Urgent action today' },
        { type: 'threat', severity: 'high', evidence: 'Account blocked' }
      ],
      external_evidence: [
        {
          title: 'SBI Advisory',
          url: 'https://bank.sbi',
          summary: 'SBI strictly warns: SBI never sends SMS asking customers to verify or update KYC via embedded links.',
          source_type: 'official'
        }
      ]
    });

    expect(result.contradicted.length).toBeGreaterThan(0);
    expect(result.contradicted[0].status).toBe('CONTRADICTED');
  });
});
