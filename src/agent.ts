import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import process from "node:process";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { extractUrls } from "./util.js";
import { recordVoice, transcribe, speak } from "./voice.js";
export { recordVoice, transcribe, speak } from "./voice.js";

// ====================================================================
// ALEXA + MCP — DIGITAL DETECTIVE AGENT
// ====================================================================

// Config (all overridable via env)
export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
export const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);
export const MCP_URL = process.env.MCP_URL ?? "http://localhost:3001/mcp";
export const MAX_STEPS = Number(process.env.MAX_STEPS ?? 8);

// Voice config
export const DD_MODE = process.env.DD_MODE ?? "text";
export const RECORD_SECONDS = Number(process.env.RECORD_SECONDS ?? 6);

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
- If the user text contains a URL, you MUST call inspect_url with the exact URL string. Never pass null.
- Never call the same tool twice with identical arguments. If a tool returns an error or empty result, change your arguments or move to the next pipeline step.

CRITICAL RULES FOR THE FINAL ANSWER:
- You must call generate_investigation_report before giving a final
  answer.
- Your final answer MUST restate the report fields: verdict,
  riskScore, redFlags, evidence, recommendation.
- If the report says LIKELY SAFE, you MUST NOT call it a scam.
  If the report says HIGH RISK, you MUST NOT call it safe.
- Do NOT add your own opinion. Do NOT guess. Do NOT contradict the
  report.
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
        num_ctx: NUM_CTX,
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

// SECTION D — Investigation reporting helper
export function printReport(r: any): void {
  console.log("\n" + "═".repeat(60));
  console.log("  INVESTIGATION REPORT  (authoritative)");
  console.log("═".repeat(60));
  console.log(`  VERDICT:      ${r?.verdict ?? "UNKNOWN"}`);
  console.log(`  RISK SCORE:   ${r?.riskScore ?? 0}/100`);
  console.log("─".repeat(60));

  if (r?.redFlags?.length) {
    console.log("\n  RED FLAGS:");
    r.redFlags.forEach((f: string) => console.log(`    • ${f}`));
  } else {
    console.log("\n  RED FLAGS: none detected");
  }

  if (r?.urlSignals?.length) {
    console.log("\n  URL SIGNALS:");
    r.urlSignals.forEach((f: string) => console.log(`    • ${f}`));
  }

  if (r?.evidence?.length) {
    console.log("\n  EVIDENCE:");
    r.evidence.slice(0, 5).forEach((e: any) => console.log(`    • ${e?.title ?? "Evidence"}  —  ${e?.url ?? ""}`));
  }

  if (r?.riskFactors?.length) {
    console.log("\n  RISK FACTORS:");
    r.riskFactors.forEach((f: any) => console.log(`    • ${f.factor}  (+${f.weight})`));
  }

  if (r?.recommendation) {
    console.log("\n  RECOMMENDATION:");
    console.log(`    ${r.recommendation}`);
  }

  console.log("═".repeat(60) + "\n");

  if (DD_MODE === "voice") {
    speak(`${r?.verdict ?? "UNKNOWN"}. Risk score ${r?.riskScore ?? 0} out of 100. ${r?.recommendation ?? ""}`);
  }
}

export function isVoiceModeEnabled(): boolean {
  return DD_MODE === "voice";
}

export function sanitizeSubject(text: string): string {
  return text.trim().slice(0, 120) || "Suspicious Message";
}

export { extractUrls } from "./util.js";

// SECTION E — Investigation loop (CRITICAL)

export function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

export async function runInvestigation(
  client: Client,
  ollamaTools: OllamaTool[],
  userInput: string
): Promise<void> {
  let lastReport: any = null;
  let reportGenerated = false; // Reset per run
  const seenCalls = new Set<string>();

  // Cached intermediate tool results for plumbing into the report
  let claimsResult: any = null;
  let analysisResult: any = null;
  const urlFindings: any[] = [];
  const evidenceResults: any[] = [];
  let crossRefResult: any = null;
  let riskResult: any = null;

  const messages: OllamaMsg[] = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    { role: "user", content: userInput },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const { message } = await ollamaChat(messages, ollamaTools);

    // FINAL ANSWER PATH
    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (!reportGenerated) {
        // Force the report call
        messages.push({
          role: "tool",
          tool_name: "generate_investigation_report",
          content: JSON.stringify({
            error: "report_missing",
            hint: "You MUST call generate_investigation_report before answering."
          })
        });
        continue;
      }
      // Print structured report — never the model's prose as the verdict
      printReport(lastReport);
      if ((message.content ?? "").trim()) {
        console.log("\nModel commentary (non-authoritative):");
        console.log((message.content ?? "").trim());
      }
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

      if (name === "cross_reference") {
        args = {
          claims: claimsResult?.claims ?? [],
          evidence: evidenceResults.flatMap((e: any) => e?.results ?? []),
        };
      }

      if (name === "calculate_risk") {
        args = {
          claims: claimsResult?.claims ?? [],
          redFlags: analysisResult?.redFlags ?? [],
          urlSignals: urlFindings.flatMap((u: any) => u?.signals ?? []),
          conflicts: crossRefResult?.conflicts ?? [],
          evidenceCount: evidenceResults.flatMap((e: any) => e?.results ?? []).length,
        };
      }

      if (name === "generate_investigation_report") {
        args = {
          subject: args.subject ?? userInput.slice(0, 120),
          claims: claimsResult?.claims ?? [],
          analysis: analysisResult ?? {},
          urlFindings,
          evidence: evidenceResults.flatMap((e: any) => e?.results ?? []),
          crossRef: crossRefResult ?? {},
          risk: riskResult ?? {},
        };
      }

      const key = name + "|" + JSON.stringify(args);
      if (seenCalls.has(key)) {
        messages.push({
          role: "tool",
          tool_name: name,
          content: JSON.stringify({
            error: "duplicate_call",
            hint: "You already called this tool with these exact arguments. Use different arguments, or proceed to the next pipeline step."
          })
        });
        console.log(`  ⏭  skipped duplicate ${name}`);
        continue;
      }
      seenCalls.add(key);

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

      // Cache intermediate tool results
      if (name === "extract_claims") claimsResult = safeJson(text);
      if (name === "analyze_message") analysisResult = safeJson(text);
      if (name === "inspect_url") urlFindings.push(safeJson(text));
      if (name === "search_evidence") evidenceResults.push(safeJson(text));
      if (name === "cross_reference") crossRefResult = safeJson(text);
      if (name === "calculate_risk") riskResult = safeJson(text);

      if (name === "generate_investigation_report") {
        lastReport = safeJson(text);
        reportGenerated = true;
      }

      // Push the tool result back to the LLM
      messages.push({
        role: "tool",
        tool_name: name,
        content: text,
      });
    }
  }

  console.log("\n⚠ Max steps reached — printing best-available report:");
  if (lastReport) printReport(lastReport);
  else console.log("(no report was generated)");
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
║  Model: ${MODEL.padEnd(12)} Mode: ${(DD_MODE.toUpperCase()).padEnd(8)} MCP: ${MCP_URL.padEnd(15)}║
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
    console.log("✗ Cannot reach Ollama. Run: ollama serve");
    process.exit(1);
  }

  const availableModels: string[] = (tagsData.models ?? []).map(
    (m: any) => m.name ?? m.model ?? ""
  );
  const modelPrefix = MODEL.includes(":") ? MODEL : `${MODEL}:`;
  const hasModel = availableModels.some(
    (m) => m === MODEL || m.startsWith(MODEL) || m.startsWith(modelPrefix)
  );
  if (!hasModel) {
    console.log(`⚠ Model "${MODEL}" is not installed. Run: ollama pull ${MODEL}`);
    process.exit(1);
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
  if (DD_MODE === "voice") {
    console.log(`🎤 Voice mode — will record ${RECORD_SECONDS}s after each prompt.`);
    speak("Digital Detective online. Listening for suspicious messages.");
  }

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      let line = "";
      if (DD_MODE === "voice") {
        const wav = recordVoice(Number(process.env.RECORD_SECONDS ?? 6));
        if (wav) line = transcribe(wav).trim();
        if (!line) {
          line = (await rl.question("detective (text fallback)› ")).trim();
        } else {
          console.log(`detective› ${line}`);
        }
      } else {
        line = (await rl.question("detective› ")).trim();
      }
      if (!line) continue;
      if (["exit", "quit", ":q"].includes(line.toLowerCase())) break;

      const urls = extractUrls(line);
      const augmented = urls.length
        ? `${line}\n\n[SYSTEM: URLs detected — inspect with inspect_url using these exact strings: ${urls.join(", ")}]`
        : line;

      try {
        await runInvestigation(client, ollamaTools, augmented);
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
    if (DD_MODE === "voice") speak("Goodbye.");
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





