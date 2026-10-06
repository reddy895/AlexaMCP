import {
  Claim,
  InspectUrlOutput,
  MessageIndicator,
  CrossReferenceOutput,
  EvidenceSource,
  CalculateRiskOutput
} from '../schemas/tools.js';

export function calculateRiskTool(params: {
  claims?: Claim[];
  url_findings?: InspectUrlOutput;
  message_indicators?: MessageIndicator[];
  cross_reference?: CrossReferenceOutput;
  evidence?: EvidenceSource[];
}): CalculateRiskOutput {
  const {
    claims = [],
    url_findings,
    message_indicators = [],
    cross_reference,
    evidence = []
  } = params;

  let score = 0;
  const reasons: string[] = [];

  // 1. URL Analysis (+25 for domain mismatch / suspicious infrastructure)
  if (url_findings) {
    if (url_findings.risk === 'high') {
      score += 25;
      const primaryReason = url_findings.suspicious_indicators[0] || 'High-risk URL structure detected';
      reasons.push(`URL Risk (+25): ${primaryReason}`);
    } else if (url_findings.risk === 'medium') {
      score += 15;
      reasons.push(`URL Warning (+15): ${url_findings.suspicious_indicators[0] || 'Unusual URL attributes detected'}`);
    } else if (url_findings.domain && !url_findings.https) {
      score += 10;
      reasons.push('Insecure Protocol (+10): Non-HTTPS endpoint');
    }
  }

  // 2. Credential Harvesting (+25)
  const credReq = message_indicators.find(i => i.type === 'credential_request');
  if (credReq) {
    score += 25;
    reasons.push('Credential Solicitation (+25): Urgent request for account credentials, OTP, or identity documents');
  }

  // 3. Employment / Upfront Fee Scam (+25)
  const jobFee = message_indicators.find(i => i.type === 'fee_for_job');
  if (jobFee) {
    score += 25;
    reasons.push('Upfront Fee for Employment (+25): Asking candidate to pay for interviews/registration is a known fraud indicator');
  }

  // 4. Impersonation of trusted brand/entity (+20)
  const impersonation = message_indicators.find(i => i.type === 'impersonation');
  if (impersonation) {
    score += 20;
    reasons.push('Entity Impersonation (+20): Message invokes trusted banking, corporate, or government brand');
  }

  // 5. Urgency & Coercive Pressure (+15)
  const urgency = message_indicators.find(i => i.type === 'urgency');
  if (urgency) {
    score += 15;
    reasons.push('Urgency Language (+15): Artificial time pressure designed to prevent deliberate verification');
  }

  // 6. Threat of consequence (+15)
  const threat = message_indicators.find(i => i.type === 'threat');
  if (threat && !reasons.some(r => r.includes('Threat'))) {
    score += 15;
    reasons.push('Coercive Threat (+15): Warning of immediate account freeze, arrest, or penalties');
  }

  // 7. Independent Evidence Contradiction (+20)
  if (cross_reference && cross_reference.contradicted.length > 0) {
    score += 20;
    reasons.push(`Contradicted by Independent Evidence (+20): ${cross_reference.contradicted[0].reason}`);
  }

  // 8. Sensationalist / Unrealistic claims (+15)
  const unrealistic = message_indicators.find(i => i.type === 'unrealistic_claims');
  if (unrealistic) {
    score += 15;
    reasons.push('Sensationalist Claim (+15): Unverifiable or statistically extraordinary claims');
  }

  // Deductions for proven positive indicators
  if (url_findings && url_findings.risk === 'low' && url_findings.https && message_indicators.length === 0) {
    score = Math.max(0, score - 20);
    reasons.push('Legitimate Signals (-20): Clean domain reputation, valid HTTPS, and neutral tone');
  }

  // Clamp final score 0 - 100
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine Risk Level
  let risk_level: CalculateRiskOutput['risk_level'] = 'low';
  if (finalScore >= 80) {
    risk_level = 'critical';
  } else if (finalScore >= 55) {
    risk_level = 'high';
  } else if (finalScore >= 25) {
    risk_level = 'medium';
  } else {
    risk_level = 'low';
  }

  // Determine Confidence based on evidence density
  let confidence: CalculateRiskOutput['confidence'] = 'medium';
  const signalCount = (url_findings ? 1 : 0) + message_indicators.length + evidence.length;
  if (signalCount >= 3 || (cross_reference && cross_reference.contradicted.length > 0)) {
    confidence = 'high';
  } else if (signalCount <= 1) {
    confidence = 'low';
  }

  return {
    risk_score: finalScore,
    confidence,
    risk_level,
    reasons: reasons.length > 0 ? reasons : ['No overt malicious or deceptive indicators detected']
  };
}
