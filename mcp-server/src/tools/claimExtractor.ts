import { Claim } from '../schemas/tools.js';

export function extractClaimsFromContent(content: string): { claims: Claim[] } {
  const claims: Claim[] = [];
  const lines = content
    .split(/\r?\n|[.!?]+(?=\s+[A-Z0-9]|$)/)
    .map(l => l.trim())
    .filter(l => l.length > 8);

  const seen = new Set<string>();

  for (const line of lines) {
    const lower = line.toLowerCase();
    let type: Claim['type'] = 'other';

    if (
      lower.includes('bank') ||
      lower.includes('sbi') ||
      lower.includes('hdfc') ||
      lower.includes('icici') ||
      lower.includes('account') ||
      lower.includes('credit card') ||
      lower.includes('debit card') ||
      lower.includes('payment') ||
      lower.includes('transfer') ||
      lower.includes('transaction') ||
      lower.includes('₹') ||
      lower.includes('rs.') ||
      lower.includes('rupees') ||
      /\bfee(s)?\b/i.test(lower) ||
      lower.includes('$') ||
      lower.includes('crypto')
    ) {
      if (
        lower.includes('job') ||
        lower.includes('interview') ||
        lower.includes('hiring') ||
        lower.includes('offer') ||
        lower.includes('salary')
      ) {
        type = 'job';
      } else if (
        lower.includes('blocked') ||
        lower.includes('freeze') ||
        lower.includes('suspended') ||
        lower.includes('unauthorized') ||
        lower.includes('security') ||
        lower.includes('kyc') ||
        lower.includes('verify')
      ) {
        type = 'security';
      } else {
        type = 'financial';
      }
    } else if (
      lower.includes('job') ||
      lower.includes('interview') ||
      lower.includes('hiring') ||
      lower.includes('recruitment') ||
      lower.includes('vacancy') ||
      lower.includes('work from home') ||
      lower.includes('salary') ||
      lower.includes('position')
    ) {
      type = 'job';
    } else if (
      lower.includes('otp') ||
      lower.includes('password') ||
      lower.includes('pin') ||
      lower.includes('blocked') ||
      lower.includes('suspended') ||
      lower.includes('hacked') ||
      lower.includes('security alert') ||
      lower.includes('verify immediately') ||
      lower.includes('identity') ||
      lower.includes('aadhaar') ||
      lower.includes('pan card')
    ) {
      type = 'security';
    } else if (
      lower.includes('scientist') ||
      lower.includes('study') ||
      lower.includes('discovered') ||
      lower.includes('research') ||
      lower.includes('cure') ||
      lower.includes('lifespan') ||
      lower.includes('health') ||
      lower.includes('percent') ||
      lower.includes('%') ||
      lower.includes('doctor') ||
      lower.includes('breakthrough')
    ) {
      type = 'product';
    } else if (
      lower.includes('breaking') ||
      lower.includes('government') ||
      lower.includes('minister') ||
      lower.includes('court') ||
      lower.includes('official order') ||
      lower.includes('police')
    ) {
      type = 'news';
    }

    // Filter duplicates
    const normalizedKey = line.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(normalizedKey) && line.length >= 10) {
      seen.add(normalizedKey);
      claims.push({
        text: line,
        type
      });
    }
  }

  // Fallback if no individual sentences split cleanly
  if (claims.length === 0 && content.trim().length > 0) {
    claims.push({
      text: content.trim(),
      type: 'other'
    });
  }

  return { claims };
}
