export interface SpokenBriefingOptions {
  style?: "concise" | "detailed";
  includeRedFlags?: boolean;
  includeEvidence?: boolean;
}

export interface InvestigationReportData {
  verdict?: "HIGH RISK" | "SUSPICIOUS" | "LIKELY SAFE" | string;
  riskScore?: number;
  subject?: string;
  redFlags?: string[];
  urlSignals?: string[];
  evidence?: Array<{ title?: string; snippet?: string; url?: string }>;
  riskFactors?: Array<{ factor: string; weight: number }>;
  recommendation?: string;
}

/**
 * Transforms a structured MCP investigation report into a natural,
 * engaging spoken briefing suitable for conversational voice assistants.
 */
export function formatSpokenBriefing(
  report: InvestigationReportData,
  opts: SpokenBriefingOptions = {}
): string {
  const style = opts.style ?? "concise";
  const verdict = (report.verdict ?? "SUSPICIOUS").toUpperCase();
  const score = report.riskScore ?? 0;
  const redFlags = report.redFlags ?? [];
  const urlSignals = report.urlSignals ?? [];
  const evidence = report.evidence ?? [];
  const recommendation = report.recommendation ?? "";

  const speechParts: string[] = [];

  // 1. Verdict Headline with calibrated tone
  if (verdict === "HIGH RISK") {
    speechParts.push(`Alert! My investigation determined this is HIGH RISK, with a risk score of ${score} out of 100.`);
  } else if (verdict === "LIKELY SAFE") {
    speechParts.push(`Good news. My investigation indicates this is LIKELY SAFE, with a low risk score of ${score} out of 100.`);
  } else {
    speechParts.push(`Caution advised. My investigation found SUSPICIOUS activity, with a risk score of ${score} out of 100.`);
  }

  // 2. Red Flags & Signals
  const keySignals = [...redFlags, ...urlSignals];
  if (keySignals.length > 0 && opts.includeRedFlags !== false) {
    if (verdict === "HIGH RISK" || verdict === "SUSPICIOUS") {
      const topSignals = keySignals.slice(0, style === "concise" ? 2 : 3);
      const formatted = topSignals.map(s => s.replace(/[\._]/g, " ")).join(", and ");
      speechParts.push(`Key warning signs include ${formatted}.`);
    }
  }

  // 3. Web Evidence
  if (evidence.length > 0 && style === "detailed" && opts.includeEvidence !== false) {
    const topEvidence = evidence[0];
    if (topEvidence?.title) {
      speechParts.push(`Web evidence reports: ${topEvidence.title}.`);
    }
  }

  // 4. Actionable recommendation
  if (recommendation) {
    // Simplify recommendation for natural speech
    let cleanRec = recommendation
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanRec.endsWith(".")) cleanRec += ".";
    speechParts.push(cleanRec);
  } else {
    if (verdict === "HIGH RISK") {
      speechParts.push("Do not click any links, send money, or share sensitive details.");
    } else if (verdict === "LIKELY SAFE") {
      speechParts.push("Standard security precautions still apply.");
    }
  }

  // 5. Conversational follow-up prompt
  speechParts.push("Would you like me to inspect another message or provide more details?");

  return speechParts.join(" ");
}
