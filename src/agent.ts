import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ====================================================================
// ALEXA + MCP — DIGITAL DETECTIVE AGENT
// ====================================================================

// Config (all overridable via env)
export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
export const MCP_URL = process.env.MCP_URL ?? "http://localhost:3001/mcp";
export const MAX_STEPS = 12;

// ANSI terminal color utilities
export const colors = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  boldCyan: (s: string) => `\x1b[1;36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// SECTION A — System prompt (embed verbatim)
export const SYSTEM_PROMPT = `
You are DIGITAL DETECTIVE, a focused investigation agent.

Your ONLY job: investigate suspicious digital content (messages, offers,
URLs, emails) and produce a structured investigation report by using the
provided tools.

YOU MUST INVESTIGATE — NEVER ANSWER FROM MEMORY.
You do not know whether something is a scam. You must find out using tools.

Mandatory pipeline (skip steps that don't apply):
1. extract_claims            — always
2. analyze_message           — always
3. inspect_url               — for each URL in the input
4. search_evidence           — at least once (search the domain, company, offer)
5. cross_reference           — after you have claims + evidence
6. calculate_risk            — after cross_reference
7. generate_investigation_report — ALWAYS finish with this

Rules:
- Call ONE tool at a time. Wait for the result before calling the next.
- Pass the actual data returned by previous tools into the next tool.
- If evidence results are empty, search again with a different query.
- After generate_investigation_report returns, reply to the user with a
  clean, human-readable summary containing:
    VERDICT
    RISK SCORE
    RED FLAGS
    EVIDENCE
    RECOMMENDATION
- Never invent tool outputs. Never pretend a tool succeeded.
`;

// SECTION B — Ollama call
export type OllamaMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_name?: string;
};

export type OllamaTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
};

export async function ollamaChat(
  messages: OllamaMsg[],
  tools: OllamaTool[]
): Promise<{ message: OllamaMsg }> {
  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(`Ollama chat call failed with status ${resp.status}: ${errorBody}`);
  }

  const json = (await resp.json()) as { message: OllamaMsg };
  return json;
}


