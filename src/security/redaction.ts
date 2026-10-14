const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+in\s+developer\s+mode/gi,
  /disregard\s+(the\s+)?above/gi,
  /bypass\s+all\s+(security|safety)\s+rules/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
];

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[0-9a-zA-Z]{36}/g,
  /sk-[a-zA-Z0-9]{32,}/g,
  /postgres:\/\/[^:]+:[^@]+@/g,
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g,
];

export function sanitizeUntrustedContent(content: string, maxLength = 50_000): string {
  if (!content || typeof content !== "string") return "";

  let sanitized = content.slice(0, maxLength);

  // Neutralize prompt injection triggers
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[PROMPT_DIRECTIVE_FILTERED]");
  }

  // Redact embedded credentials
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[CREDENTIAL_REDACTED]");
  }

  return sanitized;
}

export function frameDocumentEvidence(sourceId: string, content: string): string {
  const safeContent = sanitizeUntrustedContent(content);
  return `--- BEGIN UNTRUSTED EVIDENCE: ${sourceId} ---\n${safeContent}\n--- END UNTRUSTED EVIDENCE: ${sourceId} ---`;
}
