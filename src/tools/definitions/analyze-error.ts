import { z } from "zod";
import type { ToolDefinition } from "../registry.js";

export const AnalyzeErrorInputSchema = z.object({
  errorText: z.string().min(1).describe("The error message, stack trace, or log snippet to analyze."),
  context: z.string().optional().describe("Optional context: operation, test name, or command executed."),
});

export interface ErrorAnalysisFinding {
  errorType: string;
  likelyCause: string;
  confidence: "high" | "medium" | "low";
  parsedLocation?: {
    file: string;
    line?: number;
    column?: number;
  };
  recommendedActions: string[];
}

export function parseStackLocation(text: string): { file: string; line?: number; column?: number } | undefined {
  const match = text.match(/(?:at\s+.*?\s+\()?([A-Za-z0-9_./\\-]+\.[a-z0-9]+):(\d+):(\d+)\)?/i);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    };
  }
  return undefined;
}

export function extractErrorType(text: string): string {
  const match = text.match(/([A-Z][a-zA-Z0-9]*(?:Error|Exception)|ECONNREFUSED|ENOENT|EADDRINUSE|ETIMEDOUT)/);
  return match ? match[1] : "GenericError";
}

export function analyzeErrorPattern(errorText: string, context?: string): ErrorAnalysisFinding {
  const location = parseStackLocation(errorText);
  const errorType = extractErrorType(errorText);

  const lower = errorText.toLowerCase();

  // Pattern 1: Connection Refused (Server not running)
  if (lower.includes("econnrefused") || lower.includes("connect econnrefused")) {
    return {
      errorType: "ConnectionRefusedError",
      likelyCause: "The target service is not listening on the specified port.",
      confidence: "high",
      parsedLocation: location,
      recommendedActions: [
        "Check if the target server process is running (e.g. 'npm run server' or 'ollama serve').",
        "Verify the host and port in your environment configuration.",
        "Ensure no firewall or container network boundary is blocking local connections.",
      ],
    };
  }

  // Pattern 2: Cannot find module / file missing
  if (lower.includes("cannot find module") || lower.includes("enoent")) {
    return {
      errorType: "ModuleNotFoundError",
      likelyCause: "A required source file, asset, or node_modules package could not be located.",
      confidence: "high",
      parsedLocation: location,
      recommendedActions: [
        "Run 'npm install' to ensure all project dependencies are present.",
        "Verify relative import paths and file extensions (e.g. '.js' in ESM imports).",
        "Check that the referenced file exists in the repository.",
      ],
    };
  }

  // Pattern 3: Null pointer / TypeError
  if (lower.includes("cannot read properties of undefined") || lower.includes("is not a function") || errorType === "TypeError") {
    return {
      errorType: "TypeError",
      likelyCause: "Attempted to access a property or invoke a method on an undefined or null variable.",
      confidence: "high",
      parsedLocation: location,
      recommendedActions: [
        "Inspect variables at the fault line for undefined/null states.",
        "Use optional chaining (?.) or defensive null checks before dereferencing.",
        "Add unit tests validating edge cases with missing or partial inputs.",
      ],
    };
  }

  // Pattern 4: Port already in use
  if (lower.includes("eaddrinuse")) {
    return {
      errorType: "PortInUseError",
      likelyCause: "Another process is already bound to this port.",
      confidence: "high",
      parsedLocation: location,
      recommendedActions: [
        "Find the conflicting process with 'lsof -i :<port>' or 'fuser <port>/tcp'.",
        "Configure an alternative port via the PORT environment variable.",
      ],
    };
  }

  // Fallback generic error
  return {
    errorType,
    likelyCause: `An unhandled ${errorType} was raised during execution${context ? ` in ${context}` : ""}.`,
    confidence: "medium",
    parsedLocation: location,
    recommendedActions: [
      "Review the stack trace to locate the origin function.",
      "Check application logs for preceding warning messages.",
      "Reproduce with a targeted unit test before implementing fixes.",
    ],
  };
}

export const analyzeErrorTool: ToolDefinition = {
  name: "analyze_error",
  description:
    "Analyze error messages, stack traces, and test failures to identify root causes and actionable debugging steps.",
  parameters: AnalyzeErrorInputSchema,
  effectClass: "read_only",
  requiresConfirmation: false,
  execute: async (args: z.infer<typeof AnalyzeErrorInputSchema>) => {
    const finding = analyzeErrorPattern(args.errorText, args.context);
    return {
      errorType: finding.errorType,
      likelyCause: finding.likelyCause,
      confidence: finding.confidence,
      parsedLocation: finding.parsedLocation,
      recommendedActions: finding.recommendedActions,
      summary: `Analyzed ${finding.errorType}: ${finding.likelyCause}`,
    };
  },
};
