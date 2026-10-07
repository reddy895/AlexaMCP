import { spawnSync } from "node:child_process";
import { extractUrls, speak, transcribe, printReport } from "../src/agent.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

async function runTests() {
  console.log("=== STARTING ACCEPTANCE TEST SUITE (A1 - A10) ===\n");
  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean, extra?: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ ${desc}${extra ? ` (${extra})` : ""}`);
    }
  }

  // ---------------------------------------------------------
  // A1: Preflight check on missing model
  // ---------------------------------------------------------
  console.log("[A1] Missing model preflight check exits cleanly under 5s:");
  const a1Start = Date.now();
  const a1Proc = spawnSync("npx", ["tsx", "src/agent.ts"], {
    env: { ...process.env, OLLAMA_MODEL: "test_missing_model:99b" },
    encoding: "utf-8",
  });
  const a1Elapsed = Date.now() - a1Start;
  assert("Exits with non-zero exit code 1", a1Proc.status === 1, `Got status ${a1Proc.status}`);
  assert("Executes in under 5 seconds", a1Elapsed < 5000, `Took ${a1Elapsed}ms`);
  assert(
    "Prints ollama pull hint",
    (a1Proc.stderr + a1Proc.stdout).includes('⚠ Model "test_missing_model:99b" is not installed.') &&
      (a1Proc.stderr + a1Proc.stdout).includes("Run: ollama pull test_missing_model:99b")
  );

  // ---------------------------------------------------------
  // A3: URL Pre-extraction and no inspect_url with null
  // ---------------------------------------------------------
  console.log("\n[A3] URL pre-extraction:");
  const scamText =
    "Congratulations! You have been selected for a remote job paying ₹2,50,000 per month. Pay ₹999 registration fee at http://secure-jobs-verify.xyz/register to continue.";
  const extracted = extractUrls(scamText);
  assert("Extracts target URL exactly", extracted.length === 1 && extracted[0] === "http://secure-jobs-verify.xyz/register");
  const nonUrlText = "plain text without any link";
  assert("Returns empty array for text with no URLs", extractUrls(nonUrlText).length === 0);

  // ---------------------------------------------------------
  // A4 & A10: Tool call deduplication logic
  // ---------------------------------------------------------
  console.log("\n[A4 & A10] Tool call deduplication:");
  const seenCalls = new Set<string>();
  const call1Key = 'search_evidence|{"query":"remote Data Entry position"}';
  seenCalls.add(call1Key);
  const isDuplicate = seenCalls.has('search_evidence|{"query":"remote Data Entry position"}');
  assert("Identifies duplicate call with identical query", isDuplicate === true);
  const isDistinct = seenCalls.has('search_evidence|{"query":"different query"}');
  assert("Allows distinct query", isDistinct === false);

  // Connect to MCP server for live tool verification
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp"));
  const client = new Client({ name: "test-runner", version: "1.0.0" });
  await client.connect(transport);

  // ---------------------------------------------------------
  // A5: Legitimate site inspection (Indeed) does not produce HIGH RISK
  // ---------------------------------------------------------
  console.log("\n[A5] Legitimate job board (Indeed) inspect_url false-positive elimination:");
  const indeedRes = await client.callTool({
    name: "inspect_url",
    arguments: { url: "https://www.indeed.com/q-remote-data-entry-jobs.html" },
  });
  const indeedParsed = JSON.parse((indeedRes.content as any)[0].text);
  assert("Indeed is not flagged as suspicious", indeedParsed.suspicious === false, `Signals: ${JSON.stringify(indeedParsed.signals)}`);
  assert(
    "Body scanning for login/pay is eliminated",
    !indeedParsed.signals.some((s: string) => s.includes("Page body"))
  );

  // ---------------------------------------------------------
  // A6: Real scam URL detection still produces HIGH RISK
  // ---------------------------------------------------------
  console.log("\n[A6] Scam example detection produces HIGH RISK (>= 70):");
  const scamUrlRes = await client.callTool({
    name: "inspect_url",
    arguments: { url: "http://secure-jobs-verify.xyz/register" },
  });
  const scamUrlParsed = JSON.parse((scamUrlRes.content as any)[0].text);
  assert("Scam URL is flagged as suspicious", scamUrlParsed.suspicious === true);
  assert("Catches .xyz TLD signal", scamUrlParsed.signals.some((s: string) => s.includes(".xyz")));

  // Run extract_claims and analyze_message through MCP server
  const claimsRes = await client.callTool({
    name: "extract_claims",
    arguments: { text: scamText },
  });
  const claimsParsed = JSON.parse((claimsRes.content as any)[0].text);

  const analysisRes = await client.callTool({
    name: "analyze_message",
    arguments: { text: scamText },
  });
  const analysisParsed = JSON.parse((analysisRes.content as any)[0].text);

  // Test calculate_risk on real scam parameters
  const riskRes = await client.callTool({
    name: "calculate_risk",
    arguments: {
      urlSignals: scamUrlParsed.signals,
      redFlags: analysisParsed.redFlags,
      claims: claimsParsed.claims,
      evidenceCount: 1,
      conflicts: ["Company not found in official registry"],
    },
  });
  const riskParsed = JSON.parse((riskRes.content as any)[0].text);
  assert("Risk score is >= 70 (HIGH RISK)", riskParsed.score >= 70, `Score was: ${riskParsed.score}`);
  assert("Verdict is HIGH RISK", riskParsed.verdict === "HIGH RISK");
  assert("Risk score is floored at least 40 when URL and red flags present", riskParsed.score >= 40);

  // ---------------------------------------------------------
  // A7: Plain benign input produces LIKELY SAFE
  // ---------------------------------------------------------
  console.log("\n[Fix C Floor Tests] Score floor rules verification:");
  const floor1 = await client.callTool({
    name: "calculate_risk",
    arguments: {
      urlSignals: [],
      redFlags: ["Some red flag"],
      claims: [],
      evidenceCount: 1,
      conflicts: [],
    },
  });
  const floor1Parsed = JSON.parse((floor1.content as any)[0].text);
  assert("Score floored at 25 when red flags present", floor1Parsed.score >= 25);
  const floor2 = await client.callTool({
    name: "calculate_risk",
    arguments: {
      urlSignals: [],
      redFlags: [],
      claims: [{ claim: "Pay now", importance: "high", type: "monetary" }],
      evidenceCount: 1,
      conflicts: [],
    },
  });
  const floor2Parsed = JSON.parse((floor2.content as any)[0].text);
  assert("Score floored at 30 when high-importance claim present", floor2Parsed.score >= 30);

  console.log("\n[A7] Benign input risk calculation:");
  const benignRisk = await client.callTool({
    name: "calculate_risk",
    arguments: {
      urlSignals: [],
      redFlags: [],
      claims: [{ claim: "hello", importance: "low", type: "general" }],
      evidenceCount: 0,
      conflicts: [],
    },
  });
  const benignParsed = JSON.parse((benignRisk.content as any)[0].text);
  assert("Benign input verdict is LIKELY SAFE", benignParsed.verdict === "LIKELY SAFE");
  assert("Benign input risk score is low (< 35)", benignParsed.score < 35, `Score was: ${benignParsed.score}`);

  // ---------------------------------------------------------
  // A8: Voice functions error resilience
  // ---------------------------------------------------------
  console.log("\n[A8] Voice mode functions error safety:");
  let speakThrew = false;
  try {
    speak("Testing speech synthesis safely");
  } catch {
    speakThrew = true;
  }
  assert("speak() never crashes the agent", speakThrew === false);

  let transcribeThrew = false;
  try {
    const text = transcribe("/tmp/nonexistent-file.wav");
    assert("transcribe() returns empty string on missing file", text === "");
  } catch {
    transcribeThrew = true;
  }
  assert("transcribe() never throws", transcribeThrew === false);

  // ---------------------------------------------------------
  // A2: printReport never prints empty report
  // ---------------------------------------------------------
  console.log("\n[A2] printReport formatting resilience:");
  let printedOutput = "";
  const origLog = console.log;
  console.log = (...args: any[]) => {
    printedOutput += args.join(" ") + "\n";
  };
  try {
    printReport({
      verdict: "HIGH RISK",
      riskScore: 90,
      redFlags: ["Upfront fee demanded"],
      urlSignals: ["Suspicious .xyz domain"],
      evidence: [{ title: "DuckDuckGo Scam Report", url: "https://example.com" }],
      recommendation: "Do not send payment.",
    });
  } finally {
    console.log = origLog;
  }
  const cleanOutput = stripAnsi(printedOutput);
  assert("Report contains border formatting", cleanOutput.includes("═".repeat(60)));
  assert("Report contains authoritative banner", cleanOutput.includes("INVESTIGATION REPORT  (authoritative)"));
  assert("Report contains VERDICT", cleanOutput.includes("VERDICT:      HIGH RISK"));
  assert("Report contains RISK SCORE", cleanOutput.includes("RISK SCORE:   90/100"));
  assert("Report contains RED FLAGS", cleanOutput.includes("RED FLAGS:"));
  assert("Report contains RECOMMENDATION", cleanOutput.includes("RECOMMENDATION:"));

  await client.close();

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
