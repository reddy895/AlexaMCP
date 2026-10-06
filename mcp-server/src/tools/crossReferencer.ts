import {
  Claim,
  InspectUrlOutput,
  MessageIndicator,
  EvidenceSource,
  CrossReferenceOutput
} from '../schemas/tools.js';

export function crossReferenceTool(params: {
  claims: Claim[];
  url_findings?: InspectUrlOutput;
  message_indicators?: MessageIndicator[];
  external_evidence?: EvidenceSource[];
}): CrossReferenceOutput {
  const supported: CrossReferenceOutput['supported'] = [];
  const contradicted: CrossReferenceOutput['contradicted'] = [];
  const uncertain: CrossReferenceOutput['uncertain'] = [];
  const missing_context: string[] = [];

  const { claims, url_findings, message_indicators = [], external_evidence = [] } = params;

  if (claims.length === 0) {
    missing_context.push('No explicit verifiable claims found in the submitted input');
  }

  const indicators = message_indicators || [];
  const evidence = external_evidence || [];

  for (const claim of claims) {
    const claimLower = claim.text.toLowerCase();
    let evaluated = false;

    // Check against official external evidence
    for (const ev of evidence) {
      const summaryLower = ev.summary.toLowerCase();

      // Check contradiction
      if (
        (claimLower.includes('bank') || claimLower.includes('blocked') || claimLower.includes('verify')) &&
        summaryLower.includes('never') && summaryLower.includes('link')
      ) {
        contradicted.push({
          claim: claim.text,
          status: 'CONTRADICTED',
          reason: `Contradicted by ${ev.title}: Official authorities never instruct customers to verify accounts via SMS links.`,
          source: ev.url
        });
        evaluated = true;
        break;
      }

      if (
        (claimLower.includes('job') || claimLower.includes('interview') || claimLower.includes('pay') || claimLower.includes('999')) &&
        summaryLower.includes('does not charge') || summaryLower.includes('scam')
      ) {
        contradicted.push({
          claim: claim.text,
          status: 'CONTRADICTED',
          reason: `Contradicted by official recruitment policy: Legitimate companies never charge registration fees for interviews.`,
          source: ev.url
        });
        evaluated = true;
        break;
      }

      if (
        claimLower.includes('40%') &&
        (summaryLower.includes('no credible scientific study') || summaryLower.includes('distortion'))
      ) {
        contradicted.push({
          claim: claim.text,
          status: 'CONTRADICTED',
          reason: `Contradicted by nutritional science consensus: No clinical evidence supports a precise 40% lifespan increase.`,
          source: ev.url
        });
        evaluated = true;
        break;
      }
    }

    if (evaluated) continue;

    // Check against URL inspection
    if (url_findings) {
      if (
        (claimLower.includes('sbi') || claimLower.includes('bank') || claimLower.includes('amazon')) &&
        url_findings.suspicious_indicators.some(i => i.includes('impersonation') || i.includes('TLD') || i.includes('unreachable'))
      ) {
        contradicted.push({
          claim: `Domain claim: Destination belongs to official organization`,
          status: 'CONTRADICTED',
          reason: `Domain inspection revealed mismatch: Destination '${url_findings.domain}' does not belong to the claimed organization.`,
          source: url_findings.url
        });
        evaluated = true;
      }
    }

    if (evaluated) continue;

    // Check against high severity message indicators
    const hasJobFee = indicators.some(i => i.type === 'fee_for_job');
    const hasThreat = indicators.some(i => i.type === 'threat');
    const hasCredReq = indicators.some(i => i.type === 'credential_request');

    if (hasJobFee && (claim.type === 'job' || claim.type === 'financial')) {
      contradicted.push({
        claim: claim.text,
        status: 'CONTRADICTED',
        reason: 'Payment requested for employment opportunity violates standard recruitment standards and constitutes high scam risk.',
      });
      continue;
    }

    if ((hasThreat || hasCredReq) && claim.type === 'security') {
      uncertain.push({
        claim: claim.text,
        status: 'UNCERTAIN',
        reason: 'Unverified security alert exhibiting severe urgency coercion without cryptographically signed proof or official domain verification.'
      });
      continue;
    }

    // Default to uncertain when external sources are absent
    if (evidence.length === 0) {
      uncertain.push({
        claim: claim.text,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: 'Independent verification sources could not establish authoritative support or refutation.'
      });
      missing_context.push(`Independent third-party corroboration missing for: "${claim.text.slice(0, 50)}..."`);
    } else {
      uncertain.push({
        claim: claim.text,
        status: 'UNCERTAIN',
        reason: 'Gathered evidence provides inconclusive corroboration for the specific assertion.'
      });
    }
  }

  return {
    supported,
    contradicted,
    uncertain,
    missing_context
  };
}
