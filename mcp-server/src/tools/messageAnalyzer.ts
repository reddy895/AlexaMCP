import { MessageIndicator } from '../schemas/tools.js';

interface PatternRule {
  type: string;
  severity: 'low' | 'medium' | 'high';
  pattern: RegExp;
  description: string;
}

const RULES: PatternRule[] = [
  {
    type: 'urgency',
    severity: 'high',
    pattern: /\b(immediately|urgent(ly)?|within (\d+|24|48)\s*hours?|today|act now|last chance|time-sensitive|hurry|expir(es|ing) soon)\b/i,
    description: 'Urgency language designed to provoke impulsive action before critical thinking'
  },
  {
    type: 'threat',
    severity: 'high',
    pattern: /\b(blocked|freeze|frozen|suspended|deactivated|terminated|arrest(ed)?|legal action|police|lawsuit|penalty|fine)\b/i,
    description: 'Intimidation and threat of account deactivation or legal penalty'
  },
  {
    type: 'credential_request',
    severity: 'high',
    pattern: /\b(verify (your )?(account|details|identity|credentials|password|pin|otp)|enter (your )?(otp|password|pin)|update (kyc|pan|aadhaar))\b/i,
    description: 'Solicitation of security credentials, one-time passwords, or personal identity documentation'
  },
  {
    type: 'fee_for_job',
    severity: 'high',
    pattern: /\b(pay\s*(₹|rs\.?|inr|\$)?\s*\d+|registration fee|interview fee|training fee|security deposit for (job|interview|laptop))\b/i,
    description: 'Mandatory upfront payment requested for job recruitment or interview scheduling (classic employment scam)'
  },
  {
    type: 'impersonation',
    severity: 'high',
    pattern: /\b(state bank|sbi|hdfc|icici|rbi|income tax|amazon|microsoft|apple support|netflix|paypal|fedex|dhl)\b/i,
    description: 'Claims affiliation or communication from well-known financial institution, tech corporation, or postal courier'
  },
  {
    type: 'financial_request',
    severity: 'medium',
    pattern: /\b(transfer|wire|send money|pay to upi|gift card|crypto|bitcoin|usdt|deposit)\b/i,
    description: 'Direct request for untraceable or rapid monetary transfer'
  },
  {
    type: 'unrealistic_claims',
    severity: 'medium',
    pattern: /(guaranteed\s*(returns?|income|profit)|earn \d+ (daily|monthly)|increases?\s+lifespan\s+by\s+\d+%|100% cure|won \d+|lottery winner|congratulations you won)/i,
    description: 'Sensationalist or statistically improbable claims promising unrealistic outcomes'
  },
  {
    type: 'emotional_manipulation',
    severity: 'medium',
    pattern: /\b(don't tell anyone|confidential|secret|special offer just for you|selected exclusively|avoid disgrace)\b/i,
    description: 'Social engineering psychological manipulation appealing to secrecy, vanity, or fear'
  },
  {
    type: 'suspicious_instructions',
    severity: 'high',
    pattern: /\b(click (here|the link|below)|download (the )?attachment|install (anydesk|teamviewer|quicksupport|apk)|call this number)\b/i,
    description: 'Direct instruction to click unverified link, install remote access software, or download attachments'
  }
];

export function analyzeMessageTool(content: string): { indicators: MessageIndicator[]; message_type: string } {
  const indicators: MessageIndicator[] = [];

  for (const rule of RULES) {
    const match = content.match(rule.pattern);
    if (match) {
      indicators.push({
        type: rule.type,
        severity: rule.severity,
        evidence: `Detected pattern "${match[0]}": ${rule.description}`
      });
    }
  }

  // Determine detected message category
  let message_type = 'general_claim';
  const hasJob = indicators.some(i => i.type === 'fee_for_job') || content.toLowerCase().includes('job') || content.toLowerCase().includes('interview');
  const hasPhishing = indicators.some(i => i.type === 'credential_request' || i.type === 'threat');
  const hasFinancial = indicators.some(i => i.type === 'financial_request');
  const hasScientific = content.toLowerCase().includes('lifespan') || content.toLowerCase().includes('study') || content.toLowerCase().includes('scientist');

  if (hasPhishing && indicators.some(i => i.type === 'impersonation')) {
    message_type = 'phishing_impersonation';
  } else if (hasJob) {
    message_type = 'recruitment_scam';
  } else if (hasFinancial) {
    message_type = 'financial_extortion';
  } else if (hasScientific) {
    message_type = 'scientific_or_health_claim';
  }

  return { indicators, message_type };
}
