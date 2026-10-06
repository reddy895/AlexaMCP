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
  const RE_MONEY = /[₹$€£]\s?\d|\b\d+\s*(lakh|crore|k|million|lpa)\b/i;
  const RE_PAYMENT = /(pay|fee|deposit|transfer|registration fee|processing fee|refundable)/i;
  const RE_SENSITIVE = /(aadhaar|pan|passport|otp|password|bank|credit card|cvv|ssn|kyc)/i;
  const RE_TOO_GOOD = /(guarantee|100%|risk.?free|no experience|without interview|instant approval)/i;
  const RE_LINKS = /(click|visit|https?:\/\/|www\.)/i;
  const RE_URGENCY = /(urgent|immediately|within \d+ (hours|minutes|days)|act now)/i;

  for (const sentence of rawSentences) {
    if (RE_PAYMENT.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "payment_request",
        importance: "high",
      });
      continue;
    }

    if (RE_SENSITIVE.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "sensitive_info_request",
        importance: "high",
      });
      continue;
    }

    if (RE_TOO_GOOD.test(sentence)) {
      claims.push({
        claim: sentence,
        type: "too_good_to_be_true",
        importance: "high",
      });
      continue;
    }

    if (RE_MONEY.test(sentence)) {
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
  if (/(aadhaar|pan|passport|otp|password|bank|credit card|cvv|ssn|kyc)/i.test(content)) {
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


    const suspicious = signals.length > 0;
    return {
      url: rawUrl,
      signals,
      info,
      suspicious,
    };
  } catch (err: any) {
    info.error = err.message;
    signals.push(`Fetch error: ${err.message}`);
    return {
      url: rawUrl,
      signals,
      info,
      suspicious: true,
    };
  }
}











