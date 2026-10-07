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
export const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
export const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);
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

// SECTION C — MCP -> Ollama tool conversion
export async function mcpToolsToOllama(client: Client): Promise<OllamaTool[]> {
  const { tools } = await client.listTools();
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.inputSchema ?? { type: "object", properties: {} },
    },
  }));
}

// SECTION D — Investigation loop (CRITICAL)
export async function runInvestigation(
  client: Client,
  ollamaTools: OllamaTool[],
  userInput: string
): Promise<void> {
  const messages: OllamaMsg[] = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    { role: "user", content: userInput },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const { message } = await ollamaChat(messages, ollamaTools);

    // FINAL ANSWER PATH
    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log(`\n${colors.boldCyan("==================== INVESTIGATION REPORT ====================")}\n`);
      console.log(message.content);
      console.log(`\n${colors.boldCyan("==============================================================")}\n`);
      return;
    }

    // Push the assistant turn (with its tool_calls) into history FIRST
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: message.tool_calls,
    });

    // Execute every tool call in order
    for (const call of message.tool_calls) {
      const name = call.function?.name ?? "unknown_tool";
      let args = call.function?.arguments;
      if (typeof args === "string") {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }
      args = args ?? {};

      const argsPreview = JSON.stringify(args).slice(0, 100);
      console.log(`${colors.magenta(`▶ ${name}`)} ${colors.dim(argsPreview)}`);

      let text = "";
      try {
        const result = await client.callTool({ name, arguments: args });
        const contentList = (result.content as any[]) ?? [];
        text = contentList
          .filter((p: any) => p && p.type === "text")
          .map((p: any) => p.text)
          .join("\n");

        const preview = text.replace(/\s+/g, " ").trim().slice(0, 120);
        console.log(`  ${colors.green("✓")} ${colors.dim(preview)}...`);
      } catch (err: any) {
        text = JSON.stringify({ error: err?.message ?? String(err) });
        console.log(`  ${colors.red("✗")} ${colors.red(err?.message ?? String(err))}`);
      }

      // Push the tool result back to the LLM
      messages.push({
        role: "tool",
        tool_name: name,
        content: text,
      });
    }
  }

  console.log(colors.yellow(`\nWarning: Reached maximum investigation steps (${MAX_STEPS}) without a final verdict.`));
}

// ====================================================================
// SECTION E — main()
// ====================================================================

export async function main(): Promise<void> {
  // 1. Banner
  console.log(
    colors.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║          ALEXA + MCP — DIGITAL DETECTIVE AGENT                ║
║  Local Inference: ${MODEL.padEnd(16)} MCP: ${MCP_URL.padEnd(20)}║
╚═══════════════════════════════════════════════════════════════╝
`)
  );

  // 2. Health check Ollama
  let tagsData: any;
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    tagsData = await resp.json();
  } catch (err) {
    console.error(
      colors.red(
        `Cannot reach Ollama at ${OLLAMA_URL}.\nPlease make sure Ollama is installed and running via "ollama serve".`
      )
    );
    process.exit(1);
  }

  const availableModels: string[] = (tagsData.models ?? []).map(
    (m: any) => m.name ?? m.model ?? ""
  );
  const modelPrefix = MODEL.split(":")[0];
  const hasModel = availableModels.some(
    (m) => m === MODEL || m.startsWith(modelPrefix)
  );
  if (!hasModel) {
    console.log(
      colors.yellow(
        `Notice: Model "${MODEL}" not found. Run "ollama pull ${MODEL}" to download it.`
      )
    );
  }

  // 3. Connect MCP client
  let transport: StreamableHTTPClientTransport;
  let client: Client;
  try {
    transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
    client = new Client({ name: "digital-detective-agent", version: "1.0.0" });
    await client.connect(transport);
  } catch (err) {
    console.error(
      colors.red(
        `Cannot reach MCP server at ${MCP_URL}.\nPlease start it first via "npm run server".`
      )
    );
    process.exit(1);
  }

  // 4. List tools
  let ollamaTools: OllamaTool[] = [];
  try {
    ollamaTools = await mcpToolsToOllama(client);
    console.log(
      colors.green(`Connected. ${ollamaTools.length} investigation tools available.`)
    );
  } catch (err: any) {
    console.error(colors.red(`Failed to list tools from MCP server: ${err?.message ?? String(err)}`));
    await client.close();
    process.exit(1);
  }

  // 5. Interactive readline loop
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      let line: string;
      try {
        line = await rl.question(colors.boldCyan("detective› "));
      } catch {
        // stdin stream closed (EOF)
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;
      if (["exit", "quit", ":q"].includes(trimmed.toLowerCase())) {
        break;
      }

      try {
        await runInvestigation(client, ollamaTools, trimmed);
      } catch (err: any) {
        console.error(colors.red(`Investigation error: ${err?.message ?? String(err)}`));
      }
    }
  } finally {
    rl.close();
    try {
      await client.close();
    } catch {
      // ignore
    }
    console.log(colors.dim("bye."));
  }

}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("agent.ts")) {
  main().catch((err) => {
    console.error(colors.red(`Fatal agent error: ${err?.message ?? String(err)}`));
    process.exit(1);
  });
}





