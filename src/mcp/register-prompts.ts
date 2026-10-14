import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMcpPrompts(server: McpServer): void {
  // Prompt 1: General question answering prompt
  server.prompt(
    "ask_project_question",
    "Template for asking questions about project architecture, code, and documentation.",
    {
      question: z.string().describe("The natural-language question to ask the assistant."),
      scope: z.string().optional().describe("Optional scope or module boundary to focus on."),
    },
    ({ question, scope }) => {
      const scopeClause = scope ? ` Focus on the '${scope}' module or directory.` : "";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please answer the following project question using available tools and evidence:${scopeClause}\n\nQuestion: "${question}"`,
            },
          },
        ],
      };
    }
  );

  // Prompt 2: Error and stack trace analysis prompt
  server.prompt(
    "debug_error",
    "Template for analyzing error logs, stack traces, and test failures.",
    {
      errorLog: z.string().describe("The error message, stack trace, or log excerpt."),
    },
    ({ errorLog }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyze the following error log. Identify the root cause, confidence level, and actionable debugging steps:\n\n\`\`\`\n${errorLog}\n\`\`\``,
            },
          },
        ],
      };
    }
  );

  // Prompt 3: Scam and fraud investigation prompt
  server.prompt(
    "investigate_fraud",
    "Template for investigating suspicious digital messages, offers, or URLs.",
    {
      message: z.string().describe("The message or offer content to analyze."),
    },
    ({ message }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Investigate the following suspicious message using the fraud investigation tools and produce an authoritative risk verdict:\n\n"${message}"`,
            },
          },
        ],
      };
    }
  );
}
