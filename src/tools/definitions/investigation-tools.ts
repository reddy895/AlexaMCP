import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import {
  extractClaims,
  analyzeMessage,
  inspectUrl,
  searchEvidence,
  crossReference,
  calculateRisk,
  generateInvestigationReport,
} from "../../server.js";

export function createInvestigationTools(): ToolDefinition[] {
  return [
    {
      name: "extract_claims",
      description: "Extract structured factual claims from a piece of text.",
      parameters: z.object({ text: z.string() }),
      effectClass: "read_only",
      execute: async ({ text }: { text: string }) => {
        return { claims: extractClaims(text) };
      },
    },
    {
      name: "analyze_message",
      description: "Analyze wording for manipulation, urgency and social-engineering red flags.",
      parameters: z.object({ text: z.string() }),
      effectClass: "read_only",
      execute: async ({ text }: { text: string }) => {
        return analyzeMessage(text);
      },
    },
    {
      name: "inspect_url",
      description: "Fetch a URL safely (SSRF-protected) and report technical and content signals.",
      parameters: z.object({ url: z.string().url() }),
      effectClass: "read_only",
      execute: async ({ url }: { url: string }) => {
        return inspectUrl(url);
      },
    },
    {
      name: "search_evidence",
      description: "Search the public web (DuckDuckGo) for evidence about a claim, company, domain or offer.",
      parameters: z.object({ query: z.string() }),
      effectClass: "read_only",
      execute: async ({ query }: { query: string }) => {
        return searchEvidence(query);
      },
    },
    {
      name: "cross_reference",
      description: "Compare extracted claims against collected evidence and highlight conflicts.",
      parameters: z.object({
        claims: z.array(z.any()),
        evidence: z.array(z.any()),
      }),
      effectClass: "read_only",
      execute: async ({ claims, evidence }: { claims: any[]; evidence: any[] }) => {
        return crossReference(claims, evidence);
      },
    },
    {
      name: "calculate_risk",
      description: "Compute a 0-100 risk score and a verdict from all collected signals.",
      parameters: z.object({
        claims: z.array(z.any()),
        redFlags: z.array(z.string()),
        urlSignals: z.array(z.string()),
        conflicts: z.array(z.string()),
        evidenceCount: z.number(),
      }),
      effectClass: "read_only",
      execute: async (args: any) => {
        return calculateRisk(args);
      },
    },
    {
      name: "generate_investigation_report",
      description: "Assemble the final structured investigation report from all prior tool outputs.",
      parameters: z.object({
        subject: z.string(),
        claims: z.array(z.any()),
        analysis: z.any(),
        urlFindings: z.array(z.any()),
        evidence: z.array(z.any()),
        crossRef: z.any(),
        risk: z.any(),
      }),
      effectClass: "read_only",
      execute: async (args: any) => {
        return generateInvestigationReport(args);
      },
    },
  ];
}
