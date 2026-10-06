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





