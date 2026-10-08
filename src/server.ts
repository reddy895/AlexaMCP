import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// ====================================================================
// ALEXA + MCP — DIGITAL DETECTIVE SERVER
// ====================================================================

// SECTION A — Safety helpers (SSRF + safe fetch)
export const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "169.254.169.254",
  "metadata.google.internal",
]);

/**
 * Validates if an IPv4 address belongs to a private or loopback range.
 * Checks: 10.x, 127.x, 0.x, 172.16-31.x, 192.168.x, 169.254.x
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) return -1;
    const n = Number(p);
    return n >= 0 && n <= 255 ? n : -1;
  });
  if (nums.some((n) => n === -1)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Asserts URL safety: valid URL, http/https only, no blocked hosts or private IPs.
 */
export function assertSafeUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL format: "${raw}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol "${parsed.protocol}". Only http: and https: are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error(`Access to blocked host "${hostname}" is forbidden (SSRF protection).`);
  }

  if (isPrivateIPv4(hostname)) {
    throw new Error(`Access to private IP address "${hostname}" is forbidden (SSRF protection).`);
  }

  return parsed;
}

/**
 * Strips HTML tags from a string and collapses consecutive whitespace characters.
 */
export function stripTags(s: string): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Executes a network fetch with SSRF validation, configurable timeout, and redirection.
 * - Uses AbortController with configurable timeout (defaults to 8000ms)
 * - redirect: "follow"
 * - Sets a standard desktop browser User-Agent
 * - Returns the fetch Response
 */
export async function safeFetch(
  url: string | URL,
  opts: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {

  const parsedUrl = typeof url === "string" ? assertSafeUrl(url) : assertSafeUrl(url.toString());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(opts.headers);
    if (!headers.has("User-Agent")) {
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 DigitalDetective/1.0"
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      ...opts,
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ====================================================================
// SECTION B — Investigation logic (pure functions, no side effects)
// ====================================================================

export type ClaimType =
  | "financial"
  | "payment_request"
  | "sensitive_info_request"
  | "too_good_to_be_true"
  | "urgency"
  | "link"
  | "general";

export type Claim = {
  claim: string;
  type: ClaimType | string;
  importance: "low" | "medium" | "high";
};

/**
 * Extracts structured factual claims from a piece of text.
 * - Detects financial, payment asks, sensitive data, too-good promises, urgency, and links
 * - Importance: High for financial/payment/sensitive/too-good, Medium for link/urgency, Low for general
 */
export function extractClaims(text: string): Claim[] {

  if (!text || typeof text !== "string") return [];

  // Split on sentence boundaries and newlines
  const rawSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const claims: Claim[] = [];

  const RE_REWARD = /(won|winner|selected|congratulations|prize|lottery)/i;
  const RE_REQUEST = /(provide|send|give|share|submit|enter|fill|reply)/i;

  if (RE_REWARD.test(text) && RE_REQUEST.test(text)) {
    claims.push({
      claim: text.trim(),
      type: "sensitive_info_request",
      importance: "high",
    });
  }

  const piiRe = /(aadhaar|pan\b|passport|otp|password|bank|credit\s*card|debit\s*card|cvv|ssn|kyc|acc(?:ount)?\s*(?:no|number|#)|account\s*number|pin\b|atm\s*pin|upi\s*pin|net\s*banking|card\s*number|routing\s*number|ifsc)/i;
  const tooGoodRe = /(you\s+(?:have\s+)?won|winner|congratulations|selected|guarantee|100%|risk.?free|no\s+experience|without\s+interview|instant\s+approval|\b\d{4,}\b\s*(?:rupees|rs|inr|usd|dollars)?|earn\s+\d+|win\s+\d+)/i;
  const moneyRe = /([₹$€£]\s?\d|\b\d+\s*(lakh|crore|k|million|lpa)|\b\d{4,}\b)/i;
  const RE_PAYMENT = /\b(pay|fee|deposit|transfer|registration fee|processing fee|refundable)\b/i;
  const RE_LINKS = /(click|visit|https?:\/\/|www\.)/i;
  const RE_URGENCY = /\b(urgent|immediately|within \d+ (hours|minutes|days)|act now)\b/i;

  for (const sentence of rawSentences) {
    if (RE_PAYMENT.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "payment_request",
        importance: "high",
      });
      continue;
    }

    if (piiRe.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "sensitive_info_request",
        importance: "high",
      });
      continue;
    }

    if (tooGoodRe.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "too_good_to_be_true",
        importance: "high",
      });
      continue;
    }

    if (moneyRe.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "financial",
        importance: "high",
      });
      continue;
    }

    if (RE_URGENCY.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "urgency",
        importance: "medium",
      });
      continue;
    }

    if (RE_LINKS.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "link",
        importance: "medium",
      });
      continue;
    }

    claims.push({
      claim: sentence,
      type: "general",
      importance: "low",
    });
  }



  return claims;
}

export type MessageAnalysis = {
  redFlags: string[];
  urgencyScore: number;
  wordCount: number;
  containsUrl: boolean;
  containsMoney: boolean;
};

/**
 * Analyzes wording for manipulation, urgency, and social engineering red flags.
 */
export function analyzeMessage(text: string): MessageAnalysis {
  const content = text ?? "";
  const redFlags: string[] = [];

  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const containsUrl = /(https?:\/\/|www\.)/i.test(content);
  const containsMoney = /[₹$€£]\s?\d|\b\d+\s*(lakh|crore|k|million|lpa)\b/i.test(content);

  let urgencyScore = 0;
  if (/(urgent|immediately|within \d+ (hours|minutes|days)|act now)/i.test(content)) {
    urgencyScore += 50;
  }
  if (/(hurry|limited time|expires|today only|deadline|instant)/i.test(content)) {
    urgencyScore += 30;
  }
  if (/!{2,}/.test(content)) {
    urgencyScore += 15;
  }
  if (/[A-Z]{6,}/.test(content)) {
    urgencyScore += 15;
  }
  urgencyScore = Math.min(100, Math.max(0, urgencyScore));

  // Red flag: Urgency / pressure language

  if (/(urgent|immediately|within \d+ (hours|minutes|days)|act now|hurry|limited time)/i.test(content)) {
    redFlags.push("Urgency or pressure tactics detected to compel quick action without thinking");
  }

  // Red flag: Unsolicited reward / selection language
  if (/(congratulat(ions)?|selected|winner|won|reward|lottery|prize|chosen|claim your)/i.test(content)) {
    redFlags.push("Unsolicited reward, lottery, or selection language without prior engagement");
  }

  // Red flag: Unrealistic eligibility / earnings promise
  if (/(no experience|without interview|instant approval|guaranteed (income|job|salary|profit)|paying [₹$€£]?\s?\d|work from home.*earn)/i.test(content)) {
    redFlags.push("Unrealistic eligibility criteria or excessive earnings promised for minimal effort");
  }

  // Red flag: Guarantee language
  if (/(guarantee|100%|risk.?free|guaranteed return)/i.test(content)) {
    redFlags.push("Absolutes or guarantees offered (100% guarantee / risk-free)");
  }

  // Red flag: Upfront payment request (payment word AND money amount present)
  const hasPaymentWord = /(pay|fee|deposit|transfer|registration fee|processing fee|refundable)/i.test(content);
  if (hasPaymentWord && containsMoney) {
    redFlags.push("Upfront payment or fee requested alongside monetary figures");
  }

  // Red flag: Requests sensitive personal / financial data
  if (/\b(aadhaar|pan|passport|otp|password|bank|credit card|cvv|ssn|kyc)\b/i.test(content)) {
    redFlags.push("Requests sensitive personal, identity, banking, or authentication data");
  }

  // Red flag: URL shortener used (bit.ly, tinyurl, t.co, shorturl, rb.gy)
  if (/(bit\.ly|tinyurl\.com|t\.co|shorturl\.at|rb\.gy|is\.gd|tiny\.cc)/i.test(content)) {
    redFlags.push("URL shortener used to mask final destination domain");
  }

  // Red flag: Excessive exclamation marks (>= 3 "!")
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount >= 3) {
    redFlags.push("Excessive exclamation marks conveying artificial excitement or panic");
  }

  // Red flag: All-caps shouting (6+ consecutive uppercase letters)
  if (/[A-Z]{6,}/.test(content)) {
    redFlags.push("All-caps shouting or aggressive capitalization patterns");
  }







  return {
    redFlags,
    urgencyScore,
    wordCount,
    containsUrl,
    containsMoney,
  };
}

export type UrlInspectionResult = {
  url: string;
  signals: string[];
  info: Record<string, unknown>;
  suspicious: boolean;
};

/**
 * Inspects a URL safely with SSRF protection and technical and content heuristic checks.
 */
export async function inspectUrl(rawUrl: string): Promise<UrlInspectionResult> {
  const signals: string[] = [];
  const info: Record<string, unknown> = {};

  try {
    const parsed = assertSafeUrl(rawUrl);
    info.host = parsed.hostname;
    info.protocol = parsed.protocol;

    // Risky TLD detection
    const riskyTlds = ["tk", "ml", "ga", "cf", "gq", "xyz", "top", "work", "click"];
    const hostParts = parsed.hostname.toLowerCase().split(".");
    const tld = hostParts[hostParts.length - 1];
    if (riskyTlds.includes(tld)) {
      signals.push(`Suspicious / high-risk TLD: .${tld}`);
    }

    // Raw IPv4 address as hostname
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
      signals.push("Hostname is a raw IPv4 address rather than a domain name");
    }

    // Hostname suspicious keywords (phishing targets)
    if (/(login|verify|secure|update|account|wallet|bonus|prize)/i.test(parsed.hostname)) {
      signals.push(`Hostname contains credential or financial bait keyword: "${parsed.hostname}"`);
    }

    // Hostname hyphen count (typosquatting indicator)
    const hyphenCount = (parsed.hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      signals.push(`Hostname contains excessive hyphens (${hyphenCount}) indicative of typosquatting`);
    }

    // Safe network fetch
    const response = await safeFetch(parsed.toString(), {}, 8000);
    info.status = response.status;
    info.contentType = response.headers.get("content-type") ?? "unknown";
    info.redirectedTo = response.url;

    if (response.url && response.url !== rawUrl && response.url !== parsed.toString()) {
      signals.push(`Redirected to different URL: "${response.url}"`);
    }

    const rawBody = await response.text();
    const body = rawBody.slice(0, 100_000);

    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      info.title = stripTags(titleMatch[1]);
    }

    const metaDescMatch = body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (metaDescMatch) {
      info.description = stripTags(metaDescMatch[1]);
    }

    // Content signals restricted to title and metadata only
    const titleAndMeta = `${info.title ?? ""} ${info.description ?? ""}`;

    if (/(verify your account|enter your password|confirm your card|enter otp)/i.test(titleAndMeta)) {
      signals.push("Title/metadata demands credentials");
    }

    if (/(pay fee|registration fee|processing fee|make payment now)/i.test(titleAndMeta)) {
      signals.push("Title/metadata demands payment");
    }

    const suspicious = signals.length >= 2;
    return {
      url: rawUrl,
      signals,
      info,
      suspicious,
    };
  } catch (err: any) {
    info.error = err?.message ?? String(err);
    signals.push(`Fetch error: ${err?.message ?? String(err)}`);
    return {
      url: rawUrl,
      signals,
      info,
      suspicious: true,
    };
  }
}

export type EvidenceItem = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchEvidenceResult = {
  query: string;
  results: EvidenceItem[];
  error?: string;
};

/**
 * Searches the public web (DuckDuckGo HTML) for evidence about a claim, company, domain, or offer.
 * - Extracts up to 6 search results
 * - Decodes DuckDuckGo uddg redirect URLs
 * - Strips HTML tags and caps title (150 chars) and snippet (300 chars) lengths
 */
export async function searchEvidence(query: string): Promise<SearchEvidenceResult> {

  const cleanQuery = query.trim();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;

  try {
    const response = await safeFetch(searchUrl, {}, 10_000);
    const html = await response.text();

    const results: EvidenceItem[] = [];
    // Result blocks on DuckDuckGo HTML search: <a class="result__a" ...>TITLE</a> ... <a class="result__snippet" ...>SNIPPET</a>
    const pairRegex =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = pairRegex.exec(html)) !== null && results.length < 6) {
      let href = match[1];
      const rawTitle = match[2];
      const rawSnippet = match[3];

      // Decode DuckDuckGo uddg redirect URLs
      const uddgMatch = href.match(/[?&]uddg=([^&]+)/i);
      if (uddgMatch) {
        try {
          href = decodeURIComponent(uddgMatch[1]);
        } catch {
          // ignore decoding errors
        }
      }

      const title = stripTags(rawTitle).slice(0, 150);
      const snippet = stripTags(rawSnippet).slice(0, 300);

      results.push({
        title,
        url: href,
        snippet,
      });
    }

    // Fallback regex if snippets are formatted in div or different tag
    if (results.length === 0) {
      const fallbackLinkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let fMatch: RegExpExecArray | null;
      while ((fMatch = fallbackLinkRegex.exec(html)) !== null && results.length < 6) {
        let fHref = fMatch[1];
        const fTitle = stripTags(fMatch[2]).slice(0, 150);
        const uddgMatch = fHref.match(/[?&]uddg=([^&]+)/i);
        if (uddgMatch) {
          try {
            fHref = decodeURIComponent(uddgMatch[1]);
          } catch {}
        }
        results.push({
          title: fTitle,
          url: fHref,
          snippet: "",
        });
      }
    }


    return {
      query: cleanQuery,
      results,
    };
  } catch (err: any) {
    return {
      query: cleanQuery,
      results: [],
      error: err?.message ?? String(err),
    };
  }
}

export type CrossReferenceResult = {
  conflicts: string[];
  supports: string[];
  evidenceCount: number;
};

/**
 * Compares extracted claims against collected evidence and highlights conflicts or supports.
 */
export function crossReference(claims: Claim[], evidence: any[]): CrossReferenceResult {
  const conflicts: string[] = [];
  const supports: string[] = [];

  // Flatten evidence: could be array of { results: [...] } or direct items
  const flattenedEvidence: EvidenceItem[] = [];
  if (Array.isArray(evidence)) {
    for (const item of evidence) {
      if (item && Array.isArray(item.results)) {
        flattenedEvidence.push(...item.results);
      } else if (item && typeof item === "object" && (item.title || item.snippet)) {
        flattenedEvidence.push(item);
      }
    }
  }

  const scamWords = ["scam", "fraud", "fake", "warning", "phishing", "complaint"];
  const evidenceText = flattenedEvidence
    .map((e) => `${e.title ?? ""} ${e.snippet ?? ""}`)
    .join(" ")
    .toLowerCase();

  const foundScamWords = scamWords.filter((w) => evidenceText.includes(w));

  const safeClaims = Array.isArray(claims) ? claims : [];
  const highImportanceClaims = safeClaims.filter((c) => c && c.importance === "high");

  for (const c of highImportanceClaims) {
    if (foundScamWords.length > 0) {
      conflicts.push(
        `High-importance claim "${c.claim}" conflicts with search evidence containing scam warnings (${foundScamWords.join(", ")})`
      );
    } else {
      supports.push(
        `No direct scam warnings identified in current search evidence for claim: "${c.claim}"`
      );
    }
  }

  // If there are general conflicts based purely on scam words even without specific high-importance claims
  if (foundScamWords.length > 0 && highImportanceClaims.length === 0) {
    conflicts.push(
      `Search evidence contains prominent scam keywords: ${foundScamWords.join(", ")}`
    );
  }

  return {
    conflicts,
    supports,
    evidenceCount: flattenedEvidence.length,
  };
}

export const RISK_WEIGHTS = {
  payment_request: 25,
  sensitive_info_request: 25,
  too_good_to_be_true: 20,
  credential_request: 30,
  reward_request: 20,
  urgency: 10,
  unverified_company: 15,
  suspicious_url: 20,
  scam_evidence: 25,
  conflict: 10,
  no_evidence: 15,
} as const;

export type RiskFactor = {
  factor: string;
  weight: number;
};

export type RiskCalculationResult = {
  score: number;
  verdict: "HIGH RISK" | "SUSPICIOUS" | "LIKELY SAFE";
  factors: RiskFactor[];
};

export type CalculateRiskInput = {
  claims?: any[];
  redFlags?: string[];
  urlSignals?: string[];
  conflicts?: string[];
  evidenceCount?: number;
};

/**
 * Computes a 0-100 risk score and verdict based on accumulated signals, claims, and evidence conflicts.
 * Thresholds:
 * - score >= 70 => "HIGH RISK"
 * - score >= 35 => "SUSPICIOUS"
 * - otherwise   => "LIKELY SAFE"
 */
export function calculateRiskFloor(rawScore: number, redFlags: string[] = [], claims: any[] = [], urlSignals: string[] = []): number {
  let score = rawScore;
  if (redFlags.length > 0 && score < 40) score = 40;
  if (claims.some((c: any) => c?.importance === "high") && score < 30) score = 30;
  if (urlSignals.length > 0 && redFlags.length > 0 && score < 40) score = 40;
  return Math.min(100, Math.max(0, score));
}

export function calculateRisk(input: CalculateRiskInput): RiskCalculationResult {

  const claims = Array.isArray(input.claims) ? input.claims.filter(Boolean) : [];
  const redFlags = Array.isArray(input.redFlags) ? input.redFlags : [];
  const urlSignals = Array.isArray(input.urlSignals) ? input.urlSignals : [];
  const conflicts = Array.isArray(input.conflicts) ? input.conflicts : [];
  const evidenceCount = Math.max(0, typeof input.evidenceCount === "number" ? input.evidenceCount : 0);

  const factors: RiskFactor[] = [];

  const text = JSON.stringify(claims).toLowerCase();

  const hasCredentialAsk =
    /(pin|otp|password|cvv|acc(?:ount)?\s*(?:no|number)|card\s*number|net\s*banking|ifsc)/i.test(text) &&
    /(provide|send|give|share|submit|enter|reply)/i.test(text);

  const hasRewardAsk =
    /(won|winner|selected|congratulations|prize|lottery)/i.test(text) &&
    /(provide|send|give|share|submit|enter|reply)/i.test(text);

  if (hasCredentialAsk) {
    factors.push({
      factor: "Credential harvesting or sensitive account request in claims",
      weight: RISK_WEIGHTS.credential_request,
    });
  }

  if (hasRewardAsk) {
    factors.push({
      factor: "Unsolicited reward or prize claiming directive in claims",
      weight: RISK_WEIGHTS.reward_request,
    });
  }

  // Claim factors
  if (claims.some((c) => c?.type === "payment_request")) {
    factors.push({
      factor: "Payment or upfront fee requested in message claims",
      weight: RISK_WEIGHTS.payment_request,
    });
  }

  if (claims.some((c) => c?.type === "sensitive_info_request")) {
    factors.push({
      factor: "Sensitive personal or financial data requested in message claims",
      weight: RISK_WEIGHTS.sensitive_info_request,
    });
  }

  if (claims.some((c) => c?.type === "too_good_to_be_true")) {
    factors.push({
      factor: "Too-good-to-be-true promise or unrealistic guarantee in claims",
      weight: RISK_WEIGHTS.too_good_to_be_true,
    });
  }

  if (claims.some((c) => c?.type === "urgency")) {
    factors.push({
      factor: "High urgency or pressure tactics in claims",
      weight: RISK_WEIGHTS.urgency,
    });
  }

  // URL factors
  if (urlSignals.length > 0) {
    factors.push({
      factor: `Suspicious URL signals identified (${urlSignals.length} technical/content flags)`,
      weight: RISK_WEIGHTS.suspicious_url,
    });
  }

  // Evidence conflict factors
  if (conflicts.length > 0) {
    factors.push({
      factor: `Direct evidence conflicts and scam reports found (${conflicts.length} conflict items)`,
      weight: RISK_WEIGHTS.scam_evidence,
    });
  }

  // No evidence found
  if (evidenceCount === 0) {
    factors.push({
      factor: "Unverified entity: zero public web evidence or reputation found",
      weight: RISK_WEIGHTS.no_evidence,
    });
  }

  // Red flag content factors
  for (const rf of redFlags) {
    const lower = rf.toLowerCase();
    if (lower.includes("reward") || lower.includes("lottery") || lower.includes("selection")) {
      factors.push({
        factor: "Unsolicited reward/selection social engineering red flag",
        weight: 15,
      });
    } else if (lower.includes("earning") || lower.includes("eligibility") || lower.includes("minimal effort")) {
      factors.push({
        factor: "Unrealistic earnings or eligibility promise red flag",
        weight: 15,
      });
    } else if (lower.includes("payment") || lower.includes("fee")) {
      factors.push({
        factor: "Upfront payment demand red flag",
        weight: 20,
      });
    } else if (lower.includes("sensitive") || lower.includes("credential")) {
      factors.push({
        factor: "Credential harvesting or sensitive data request red flag",
        weight: 20,
      });
    }
  }

  // Calculate sum and clamp 0-100
  const rawScore = factors.reduce((acc, f) => acc + f.weight, 0);
  let score = Math.min(100, Math.max(0, rawScore));

  if (redFlags.length > 0 && score < 40) score = 40;
  if (claims.some((c: any) => c?.importance === "high") && score < 30) score = 30;
  if (urlSignals.length > 0 && redFlags.length > 0 && score < 40) score = 40;
  if (hasCredentialAsk && score < 75) score = 75;
  if (hasRewardAsk && score < 70) score = 70;

  score = Math.min(100, Math.max(0, score));

  // Recompute verdict based on calibrated floored score
  let verdict: "HIGH RISK" | "SUSPICIOUS" | "LIKELY SAFE";
  if (score >= 70) {
    verdict = "HIGH RISK";
  } else if (score >= 35) {
    verdict = "SUSPICIOUS";
  } else {
    verdict = "LIKELY SAFE";
  }

  return {
    score,
    verdict,
    factors,
  };
}

export type InvestigationReportInput = {
  subject: string;
  claims: any[];
  analysis: any;
  urlFindings?: any[];
  evidence?: any[];
  crossRef?: any;
  risk?: any;
};

/**
 * Assembles the final structured investigation report from all prior tool outputs.
 */
export function generateInvestigationReport(input: InvestigationReportInput) {
  const subject = input.subject ?? "Suspicious Content";
  const claims = Array.isArray(input.claims) ? input.claims : [];
  const analysis = input.analysis ?? {};
  const redFlags = input.analysis?.redFlags ?? (Array.isArray(analysis.redFlags) ? analysis.redFlags : []);

  const urlFindings = Array.isArray(input.urlFindings) ? input.urlFindings : [];
  const urlSignals: string[] = Array.isArray(urlFindings) ? urlFindings.flatMap((u: any) =>
    (u?.signals ?? []).map((s: string) => (u?.url ? `${u.url}: ${s}` : s))
  ) : [];

  // Flatten evidence and take top 5
  const rawEvidence = Array.isArray(input.evidence) ? input.evidence : [];
  const flattenedEvidence: EvidenceItem[] = [];
  for (const item of rawEvidence) {
    if (item && Array.isArray(item.results)) {
      flattenedEvidence.push(...item.results);
    } else if (item && typeof item === "object" && (item.title || item.snippet)) {
      flattenedEvidence.push(item);
    }
  }
  const evidence = flattenedEvidence.slice(0, 5);

  const crossRef = input.crossRef ?? {};
  const conflictingEvidence = Array.isArray(crossRef.conflicts) ? crossRef.conflicts : [];
  const supportingEvidence = Array.isArray(crossRef.supports) ? crossRef.supports : [];

  const risk = input.risk ?? {};
  let riskScore = typeof risk.score === "number" ? risk.score : 0;
  riskScore = calculateRiskFloor(riskScore, redFlags, claims, urlSignals);
  const verdict = risk.verdict && riskScore === risk.score
    ? risk.verdict
    : (riskScore >= 70 ? "HIGH RISK" : riskScore >= 35 ? "SUSPICIOUS" : "LIKELY SAFE");
  const riskFactors = Array.isArray(risk.factors) ? risk.factors : [];

  // Recommendation text based on riskScore
  let recommendation: string;
  if (riskScore >= 70) {
    recommendation =
      "Do NOT send money, documents, or personal data. Independently verify the sender through official channels.";
  } else if (riskScore >= 35) {
    recommendation = "Treat with caution. Verify the sender and any links before acting.";
  } else {
    recommendation = "No strong red flags detected, but stay alert for follow-up requests.";
  }

  const summary = `Investigation completed for: "${subject}". Verdict: ${verdict} (Risk Score: ${riskScore}/100) based on ${claims.length} extracted claims, ${redFlags.length} linguistic red flags, ${urlSignals.length} URL signals, and ${flattenedEvidence.length} public evidence items.`;

  return {
    verdict,
    riskScore,
    subject,
    summary,
    redFlags,
    urlSignals,
    claims,
    evidence,
    conflictingEvidence,
    supportingEvidence,
    riskFactors,
    recommendation,
  };
}

// ====================================================================
// SECTION C — MCP tool registration
// ====================================================================

/**
 * Builds and returns a fresh, stateless McpServer instance with all investigation tools registered.
 */
export function buildServer(): McpServer {
  const server = new McpServer({
    name: "digital-detective",
    version: "1.0.0",
  });

  // 1. extract_claims
  server.tool(
    "extract_claims",
    "Extract structured factual claims from a piece of text. Always call this first.",
    {
      text: z.string(),
    },
    async ({ text }) => {
      const claims = extractClaims(text);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ claims }, null, 2),
          },
        ],
      };
    }
  );

  // 2. analyze_message
  server.tool(
    "analyze_message",
    "Analyze wording for manipulation, urgency and social-engineering red flags.",
    {
      text: z.string(),
    },
    async ({ text }) => {
      const result = analyzeMessage(text);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 3. inspect_url
  server.tool(
    "inspect_url",
    "Fetch a URL safely (SSRF-protected) and report signals.\n   Input MUST be the exact URL string, never null.\n   If no URL exists in the input, do not call this tool.",
    {
      url: z.string().url(),
    },
    async ({ url }) => {
      const result = await inspectUrl(url);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 4. search_evidence
  server.tool(
    "search_evidence",
    "Search the public web (DuckDuckGo) for evidence about a claim, company, domain or offer.",
    {
      query: z.string(),
    },
    async ({ query }) => {
      const result = await searchEvidence(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 5. cross_reference
  server.tool(
    "cross_reference",
    "Compare extracted claims against collected evidence and highlight conflicts.",
    {
      claims: z.array(z.any()),
      evidence: z.array(z.any()),
    },
    async ({ claims, evidence }) => {
      const result = crossReference(claims, evidence);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 6. calculate_risk
  server.tool(
    "calculate_risk",
    "Compute a 0-100 risk score and a verdict from all collected signals.",
    {
      claims: z.array(z.any()),
      redFlags: z.array(z.string()),
      urlSignals: z.array(z.string()),
      conflicts: z.array(z.string()),
      evidenceCount: z.number(),
    },
    async ({ claims, redFlags, urlSignals, conflicts, evidenceCount }) => {
      const result = calculateRisk({
        claims,
        redFlags,
        urlSignals,
        conflicts,
        evidenceCount,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 7. generate_investigation_report
  server.tool(
    "generate_investigation_report",
    "Assemble the final structured investigation report from all prior tool outputs.",
    {
      subject: z.string(),
      claims: z.array(z.any()),
      analysis: z.any(),
      urlFindings: z.array(z.any()),
      evidence: z.array(z.any()),
      crossRef: z.any(),
      risk: z.any(),
    },
    async ({ subject, claims, analysis, urlFindings, evidence, crossRef, risk }) => {
      const result = generateInvestigationReport({
        subject,
        claims,
        analysis,
        urlFindings,
        evidence,
        crossRef,
        risk,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

// ====================================================================
// SECTION D — Express + Streamable HTTP transport
// ====================================================================

export const app = express();
app.use(express.json({ limit: "1mb" }));

// POST /mcp handler
app.post("/mcp", async (req, res) => {
  try {
    // Normalize accept header so standard HTTP clients and curl work seamlessly with SSE transport
    if (
      !req.headers.accept ||
      req.headers.accept.includes("*/*") ||
      !req.headers.accept.includes("text/event-stream")
    ) {
      req.headers.accept = "application/json, text/event-stream";
    }

    // FRESH PER REQUEST - stateless
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  }
});

// GET /mcp -> 405
app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "method_not_allowed" });
});

// DELETE /mcp -> 405
app.delete("/mcp", (_req, res) => {
  res.status(405).json({ error: "method_not_allowed" });
});

// GET /healthz -> { ok: true }
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const isMain = !process.argv[1] || process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js");
if (isMain) {
  app.listen(PORT, () => {
    console.error(`[mcp] Digital Detective MCP server on http://localhost:${PORT}/mcp`);
  });
}






















